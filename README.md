# NeuroADHD: ADHD Diagnosis Prediction Using Machine Learning

An end-to-end data science project that predicts an **ADHD diagnosis** from the public **ADHD-200** dataset. It covers data acquisition, cleaning, exploratory analysis, feature engineering, 13 machine-learning algorithms, hyper-parameter tuning, ensembles, explainability (SHAP), and a **resting-state fMRI connectivity** analysis.
The results are presented in a full-width, responsive website.

**Live website:** https://harivaishnavi28192.github.io/NeuroADHD/

> **Disclaimer:** this is an educational and research project, **not** a diagnostic tool.

---

## Results at a glance

| Question | Data | Best model | Test ROC-AUC |
|---|---|---|---|
| **Set A:** Can ADHD be predicted from demographics + IQ only? | 935 children, 9 sites | Random Forest (tuned) | **0.73** (95% CI 0.65–0.80) |
| **Set B:** How well does a screening model with parent symptom ratings do? | 477 children (NYU + Peking) | Logistic Regression (tuned) | **0.96** (95% CI 0.91–0.99) |
| **fMRI:** Can brain connectivity predict ADHD? | 40 subjects, nilearn sample | PCA + SVM, MSDL correlation (best of 42) | **0.63** (accuracy 0.56, permutation p = 0.11: not above chance) |

Main findings:
- **Symptom ratings** almost determine the label (Cohen's d > 2). They are part of how ADHD is diagnosed, so Set B is a *screening* model, not a biomarker.
- **Site is a confounder:** ADHD prevalence ranges from 0 % to 58 % across clinics. The site name alone reaches AUC 0.70, so it is excluded from features, and models are also checked with **leave-one-site-out** validation.
- **Fairness:** without questionnaires, sensitivity is 75 % for boys but only 25 % for girls.
- **SHAP** revealed a hidden site artefact: *handedness* ranked high only because NYU coded it differently. It was fixed in cleaning by reducing every site to the dominant hand.

## Project structure

```
NeuroADHD/
├── data/
│   ├── raw/                         ADHD-200 participants.tsv files (10 sites)
│   └── processed/                   clean tables, train/test split, fMRI time series
├── notebooks/
│   ├── 01_data_acquisition_cleaning.ipynb
│   ├── 02_exploratory_data_analysis.ipynb
│   ├── 03_preprocessing_feature_engineering.ipynb
│   ├── 04_model_training_evaluation.ipynb
│   ├── 05_model_interpretation.ipynb
│   └── 06_fmri_connectivity_classification.ipynb
├── src/neuroadhd/                   reusable code
│   ├── config.py                    paths & constants
│   ├── data.py                      download / merge / clean
│   ├── features.py                  feature engineering, pipelines, model zoo
│   ├── fmri.py                      parallel, resumable fMRI download
│   └── plotting.py                  colour-blind-safe chart style
├── models/                          best_model_*.joblib
├── reports/                         figures/ + JSON metrics + predictions
├── scripts/build_website.py         bundles results into the website
├── website/                         responsive project site (open index.html)
└── requirements.txt
```

## Notebooks

| # | Notebook | Contents |
|---|---|---|
| 01 | Data acquisition & cleaning | download 10 sites, harmonise codes & rating scales, remove 101 duplicate rows, missingness audit |
| 02 | Exploratory data analysis | target & subtypes, site effects, demographics, IQ, symptoms, t-tests / Mann-Whitney / χ², Cohen's d, correlations, pair plot, outliers, PCA & t-SNE |
| 03 | Preprocessing & feature engineering | stratified split, engineered features, VIF, imputation (mean/median/KNN/iterative), scaling, class imbalance (weights/SMOTE/under-sampling), feature selection (MI, ANOVA, L1, RFECV) |
| 04 | Model training & evaluation | 13 algorithms + baseline, RandomizedSearchCV, voting & stacking, Youden threshold, locked test set with bootstrap CIs, ROC/PR/calibration, leave-one-site-out, site-confound test, subgroup fairness, subtype classification |
| 05 | Model interpretation | permutation importance, SHAP (beeswarm + individual), PDP/ICE, odds ratios, error analysis, predictions for the unlabelled Brown site |
| 06 | fMRI connectivity | nilearn time-series extraction (MSDL & BASC-64), correlation / partial / tangent connectivity, connectome plots, 7 classifiers, repeated CV, permutation test |

## How to run

```bash
# 1. environment
python -m venv .venv
.venv\Scripts\activate          # Windows  (macOS/Linux: source .venv/bin/activate)
pip install -r requirements.txt

# 2. notebooks (run in order, from the notebooks/ folder)
jupyter lab notebooks/

# 3. rebuild the website after re-running notebooks
python scripts/build_website.py
```

Notebook 06 downloads about 2.9 GB of preprocessed fMRI into `~/nilearn_data` (outside the project), then caches the small time-series files in `data/processed/`.

## Website

Open `website/index.html` in a browser; no server is needed. It uses the full laptop width and adapts to tablets and phones. It includes:
- key numbers, project definition, data and pipeline overview
- tabbed EDA gallery with a click-to-zoom lightbox
- an interactive model-comparison chart (Set A / Set B toggle, hover tooltips, table view)
- test-set result cards, robustness and fairness checks, SHAP explanations
- the fMRI connectivity results
- a **live in-browser demo** of the logistic-regression model with per-feature contributions
- every notebook rendered as HTML, plus `.ipynb` downloads

To publish it, push the repository to GitHub and enable **GitHub Pages** on the `website/` folder (or copy its contents to a `docs/` folder).

## Data & acknowledgements

- **ADHD-200 Consortium**, via the 1000 Functional Connectomes Project / INDI (phenotypic data from the public `fcp-indi` S3 bucket).
- **Nilearn** preprocessed 40-subject ADHD resting-state sample and the MSDL / BASC atlases.
