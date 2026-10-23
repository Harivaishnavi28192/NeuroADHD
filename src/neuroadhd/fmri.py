"""Robust, parallel, resumable download of nilearn's 40-subject ADHD-200 fMRI sample.

nilearn's own `fetch_adhd` downloads one 72 MB archive at a time and gives up on a
dropped connection. This helper fetches the same NITRC archives in parallel, resumes
partial files, and extracts them to ~/nilearn_data/adhd_neuroadhd (outside the project
folder, so ~3 GB of imaging data is never synced or committed).
"""
import tarfile
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import pandas as pd

BASE = "https://www.nitrc.org/frs/download.php/"
DATA_DIR = Path.home() / "nilearn_data" / "adhd_neuroadhd"


def _subject_ids():
    from nilearn.datasets.func import adhd_ids
    return adhd_ids()


def _download(url: str, dest: Path, retries: int = 30) -> Path:
    """Download with HTTP Range resume; retries on dropped connections."""
    done = dest.with_suffix(dest.suffix + ".ok")
    if done.exists():
        return dest
    for attempt in range(retries):
        try:
            have = dest.stat().st_size if dest.exists() else 0
            req = urllib.request.Request(url, headers={"Range": f"bytes={have}-"} if have else {})
            with urllib.request.urlopen(req, timeout=60) as r:
                total = have + int(r.headers.get("Content-Length", 0))
                mode = "ab" if (have and r.status == 206) else "wb"
                with open(dest, mode) as f:
                    while chunk := r.read(1 << 20):
                        f.write(chunk)
            if dest.stat().st_size >= total:
                done.touch()
                return dest
        except Exception:  # network hiccup: wait and resume
            time.sleep(min(5 * (attempt + 1), 30))
    raise RuntimeError(f"could not download {url}")


def _extract(archive: Path, out: Path):
    marker = archive.with_suffix(".extracted")
    if not marker.exists():
        with tarfile.open(archive) as t:
            t.extractall(out, filter="data")
        marker.touch()


def fetch_adhd_fmri(n_subjects: int = 40, workers: int = 8, verbose: bool = True) -> dict:
    """Return {'func': [...], 'confounds': [...], 'phenotypic': DataFrame}."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    ids = _subject_ids()[:n_subjects]
    jobs = [(BASE + "7781/adhd40_metadata.tgz", DATA_DIR / "adhd40_metadata.tgz")]
    jobs += [(BASE + f"{nid}/adhd40_{sid}.tgz", DATA_DIR / f"adhd40_{sid}.tgz")
             for nid, sid in zip(range(7782, 7822), ids)]

    def work(job):
        path = _download(*job)
        _extract(path, DATA_DIR)
        return path.name

    with ThreadPoolExecutor(max_workers=workers) as ex:
        for i, name in enumerate(ex.map(work, jobs), 1):
            if verbose:
                print(f"\r{i}/{len(jobs)} archives ready", end="", flush=True)
    if verbose:
        print()

    pheno = pd.read_csv(next(DATA_DIR.rglob("ADHD200_40subs_motion_parameters_and_phenotypics.csv")))
    pheno["Subject"] = pheno["Subject"].apply(lambda x: f"{int(x):07d}")
    pheno = pheno.set_index("Subject").loc[ids].reset_index()
    func = [str(next(DATA_DIR.rglob(f"{s}_rest_tshift_RPI_voreg_mni.nii.gz"))) for s in ids]
    conf = [str(next(DATA_DIR.rglob(f"{s}_regressors.csv"))) for s in ids]
    return {"func": func, "confounds": conf, "phenotypic": pheno}
