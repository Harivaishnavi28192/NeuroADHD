"""Project paths and constants shared by every notebook."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA_RAW = ROOT / "data" / "raw"
DATA_PROCESSED = ROOT / "data" / "processed"
MODELS = ROOT / "models"
FIGURES = ROOT / "reports" / "figures"
REPORTS = ROOT / "reports"
WEBSITE_DATA = ROOT / "website" / "assets" / "data"

for _p in (DATA_RAW, DATA_PROCESSED, MODELS, FIGURES, WEBSITE_DATA):
    _p.mkdir(parents=True, exist_ok=True)

RANDOM_STATE = 42

# ADHD-200 sites hosted on the public INDI S3 bucket (BIDS release).
S3_BASE = "https://fcp-indi.s3.amazonaws.com/data/Projects/ADHD200/RawDataBIDS"
SITES = ["Brown", "KKI", "NYU", "NeuroIMAGE", "OHSU",
         "Peking_1", "Peking_2", "Peking_3", "Pittsburgh", "WashU"]

# Feature groups used throughout the project
DEMOGRAPHIC = ["age", "sex_male", "handedness"]
COGNITIVE = ["verbal_iq", "performance_iq", "full_iq"]
SYMPTOMS = ["adhd_index_z", "inattentive_z", "hyper_impulsive_z"]
TARGET = "adhd"
