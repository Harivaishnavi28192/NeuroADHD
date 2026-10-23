"""Download, merge and clean the ADHD-200 phenotypic (clinical) data."""
import urllib.request

import numpy as np
import pandas as pd

from .config import DATA_PROCESSED, DATA_RAW, S3_BASE, SITES

MISSING_CODES = [-999, "-999", "N/A", "n/a", ""]

DX_MAP = {
    "Typically Developing Children": "TD",
    "ADHD-Combined": "ADHD-C",
    "ADHD-Inattentive": "ADHD-I",
    "ADHD-Hyperactive/Impulsive": "ADHD-H",
}

# Theoretical score ranges of each rating instrument, used to put both scales on 0-1.
# Conners' Parent Rating Scale: T-scores (floor 40 in this release, ceiling ~100).
# ADHD Rating Scale IV (Chinese version, items scored 1-4): 9 items per sub-scale.
SCALE_RANGES = {
    "Conners": {"adhd_index": (40, 100), "inattentive": (40, 100), "hyper_impulsive": (40, 100)},
    "ADHD-RS": {"adhd_index": (18, 72), "inattentive": (9, 36), "hyper_impulsive": (9, 36)},
}
SITE_SCALE = {"NYU": "Conners", "Peking_1": "ADHD-RS", "Peking_2": "ADHD-RS", "Peking_3": "ADHD-RS"}


def download_raw(force: bool = False) -> list:
    """Fetch participants.tsv for every site (skips files already on disk)."""
    paths = []
    for site in SITES:
        dest = DATA_RAW / f"participants_{site}.tsv"
        if force or not dest.exists():
            urllib.request.urlretrieve(f"{S3_BASE}/{site}/participants.tsv", dest)
        paths.append(dest)
    return paths


def load_raw() -> pd.DataFrame:
    """Read every site file and stack them into one table with a `site` column."""
    frames = []
    for site in SITES:
        df = pd.read_csv(DATA_RAW / f"participants_{site}.tsv", sep="\t",
                         encoding="latin-1", na_values=MISSING_CODES)
        df.columns = [c.strip().rstrip("_").lower() for c in df.columns]
        df.insert(0, "site", site)
        frames.append(df)
    return pd.concat(frames, ignore_index=True, sort=False)


def _handedness(value):
    if pd.isna(value):
        return np.nan
    text = str(value).strip().lower()
    if text in {"right", "r"}:
        return 1.0
    if text in {"left", "l"}:
        return -1.0
    if text.startswith("ambi"):
        return 0.0
    # NYU records a continuous laterality index (-1..1) while every other site records
    # the dominant hand as text. Keeping the raw index lets a model recognise NYU
    # (58 % ADHD) from handedness, so it is reduced to the dominant hand like the others.
    num = pd.to_numeric(text, errors="coerce")
    if pd.isna(num) or not -1 <= num <= 1:
        return np.nan
    return float(np.sign(num))


def _severity(row, col):
    scale = row["rating_scale"]
    if pd.isna(scale) or pd.isna(row[col]):
        return np.nan
    lo, hi = SCALE_RANGES[scale][col]
    return float(np.clip((row[col] - lo) / (hi - lo), 0, 1))


def clean(raw: pd.DataFrame) -> pd.DataFrame:
    """Harmonise all sites into one tidy, analysis-ready table."""
    df = pd.DataFrame({"site": raw["site"], "participant_id": raw["participant_id"].astype(int)})
    df["subject_key"] = df["site"] + "_" + df["participant_id"].astype(str)

    df["dx_label"] = raw["dx"].map(DX_MAP)
    df["adhd"] = df["dx_label"].map(lambda d: np.nan if pd.isna(d) else int(d != "TD"))

    df["sex_male"] = raw["gender"].map({"Male": 1, "Female": 0})
    df["age"] = pd.to_numeric(raw["age"], errors="coerce")
    df["handedness"] = raw["handedness"].map(_handedness)

    df["verbal_iq"] = pd.to_numeric(raw.get("verbal_iq"), errors="coerce")
    df["performance_iq"] = pd.to_numeric(raw.get("performance_iq"), errors="coerce")
    df["full_iq"] = pd.to_numeric(raw.get("full4_iq"), errors="coerce").fillna(
        pd.to_numeric(raw.get("full2_iq"), errors="coerce"))
    df["iq_measure"] = raw["iq_measure"].where(~raw["iq_measure"].astype(str).isin(["1", "-999"]))

    df["rating_scale"] = df["site"].map(SITE_SCALE)
    for col in ["adhd_index", "inattentive", "hyper_impulsive"]:
        df[col] = pd.to_numeric(raw.get(col), errors="coerce")
    no_scores = df[["adhd_index", "inattentive", "hyper_impulsive"]].isna().all(axis=1)
    df.loc[no_scores, "rating_scale"] = np.nan
    for col in ["adhd_index", "inattentive", "hyper_impulsive"]:
        df[f"{col}_sev"] = df.apply(_severity, axis=1, col=col)

    med = raw["med_status"].astype(str).str.lower()
    df["med_naive"] = np.where(med.str.startswith("not"), 0,
                               np.where(med.str.startswith("medication"), 1, np.nan))
    df["secondary_dx"] = raw["secondary_dx"].astype(str).str.strip().replace({"nan": np.nan, "": np.nan})
    df["qc_rest_pass"] = (raw["qc_rest_1"].astype(str).str.lower().isin(["pass", "1"])).astype(int)

    # Physiologically impossible values -> missing
    for col in ["verbal_iq", "performance_iq", "full_iq"]:
        df.loc[~df[col].between(40, 200), col] = np.nan
    df.loc[~df["age"].between(5, 30), "age"] = np.nan

    # The BIDS release lists some test-set subjects twice: keep one row per child
    return df.drop_duplicates("subject_key", keep="first").reset_index(drop=True)


def load_clean(path=None) -> pd.DataFrame:
    return pd.read_csv(path or DATA_PROCESSED / "adhd200_clean.csv")
