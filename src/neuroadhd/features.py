"""Feature engineering, preprocessing pipelines and the model zoo."""
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.discriminant_analysis import LinearDiscriminantAnalysis
from sklearn.ensemble import (AdaBoostClassifier, ExtraTreesClassifier,
                              GradientBoostingClassifier, RandomForestClassifier)
from sklearn.experimental import enable_iterative_imputer  # noqa: F401
from sklearn.impute import IterativeImputer, KNNImputer, SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.naive_bayes import GaussianNB
from sklearn.neighbors import KNeighborsClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.svm import SVC
from sklearn.tree import DecisionTreeClassifier

from .config import RANDOM_STATE

BASE_NUMERIC = ["age", "sex_male", "handedness", "verbal_iq", "performance_iq", "full_iq"]
ENGINEERED = ["iq_discrepancy", "iq_missing", "age_sq"]
SYMPTOM_NUMERIC = ["adhd_index_sev", "inattentive_sev", "hyper_impulsive_sev", "inatt_minus_hyper"]
SITE = ["site"]

FEATURE_SETS = {
    # Set A: what is available for every child, no questionnaire needed
    "A_demographic_cognitive": {"numeric": BASE_NUMERIC + ENGINEERED, "categorical": []},
    # Set B: adds parent-rated symptom severity (only NYU + Peking sites)
    "B_with_symptom_ratings": {"numeric": BASE_NUMERIC + ENGINEERED + SYMPTOM_NUMERIC,
                               "categorical": []},
}


def add_features(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    out["iq_discrepancy"] = out["verbal_iq"] - out["performance_iq"]     # VIQ-PIQ split
    out["iq_missing"] = out[["verbal_iq", "performance_iq"]].isna().any(axis=1).astype(int)
    out["age_sq"] = (out["age"] - 12) ** 2                               # non-linear age effect
    out["inatt_minus_hyper"] = out["inattentive_sev"] - out["hyper_impulsive_sev"]  # subtype profile
    return out


def make_imputer(kind: str = "median"):
    return {
        "median": SimpleImputer(strategy="median"),
        "mean": SimpleImputer(strategy="mean"),
        "knn": KNNImputer(n_neighbors=7),
        "iterative": IterativeImputer(max_iter=15, random_state=RANDOM_STATE),
    }[kind]


def make_preprocessor(numeric, categorical, imputer: str = "median") -> ColumnTransformer:
    num = Pipeline([("impute", make_imputer(imputer)), ("scale", StandardScaler())])
    cat = Pipeline([("impute", SimpleImputer(strategy="most_frequent")),
                    ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False))])
    transformers = [("num", num, numeric)]
    if categorical:
        transformers.append(("cat", cat, categorical))
    return ColumnTransformer(transformers, verbose_feature_names_out=False)


def model_zoo(scale_pos_weight: float = 1.0) -> dict:
    """Every classifier compared in the project, with sensible starting settings."""
    from lightgbm import LGBMClassifier
    from xgboost import XGBClassifier

    rs = RANDOM_STATE
    return {
        "Logistic Regression": LogisticRegression(max_iter=2000, class_weight="balanced"),
        "LDA": LinearDiscriminantAnalysis(),
        "Gaussian NB": GaussianNB(),
        "KNN": KNeighborsClassifier(n_neighbors=15, weights="distance"),
        "SVM (RBF)": SVC(C=1.0, probability=True, class_weight="balanced", random_state=rs),
        "Decision Tree": DecisionTreeClassifier(max_depth=5, class_weight="balanced", random_state=rs),
        "Random Forest": RandomForestClassifier(n_estimators=400, min_samples_leaf=3,
                                                class_weight="balanced", n_jobs=-1, random_state=rs),
        "Extra Trees": ExtraTreesClassifier(n_estimators=400, min_samples_leaf=3,
                                            class_weight="balanced", n_jobs=-1, random_state=rs),
        "AdaBoost": AdaBoostClassifier(n_estimators=200, learning_rate=0.5, random_state=rs),
        "Gradient Boosting": GradientBoostingClassifier(random_state=rs),
        "XGBoost": XGBClassifier(n_estimators=300, max_depth=3, learning_rate=0.05, subsample=0.9,
                                 colsample_bytree=0.9, scale_pos_weight=scale_pos_weight,
                                 eval_metric="logloss", random_state=rs, n_jobs=-1),
        "LightGBM": LGBMClassifier(n_estimators=300, learning_rate=0.03, num_leaves=15,
                                   class_weight="balanced", random_state=rs, verbose=-1),
        "MLP": MLPClassifier(hidden_layer_sizes=(32, 16), alpha=1e-2, max_iter=2000,
                             early_stopping=True, random_state=rs),
    }


def feature_names(preprocessor) -> list:
    return list(preprocessor.get_feature_names_out())


def cohens_d(a, b) -> float:
    a, b = np.asarray(a, float), np.asarray(b, float)
    a, b = a[~np.isnan(a)], b[~np.isnan(b)]
    pooled = np.sqrt(((len(a) - 1) * a.var(ddof=1) + (len(b) - 1) * b.var(ddof=1)) / (len(a) + len(b) - 2))
    return (a.mean() - b.mean()) / pooled
