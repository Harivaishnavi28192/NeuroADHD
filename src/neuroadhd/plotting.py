"""One consistent, colour-blind-safe chart style for every figure in the project."""
import matplotlib as mpl
import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap

from .config import FIGURES

# Validated categorical palette (fixed order, never cycled)
PALETTE = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100",
           "#e87ba4", "#008300", "#6250d6", "#e34948"]
TD_COLOR, ADHD_COLOR = PALETTE[0], PALETTE[1]
CLASS_COLORS = {"TD": TD_COLOR, "ADHD": ADHD_COLOR, 0: TD_COLOR, 1: ADHD_COLOR}

INK, INK_2, MUTED = "#0b0b0b", "#52514e", "#898781"
GRID, AXIS, SURFACE = "#e1e0d9", "#c3c2b7", "#fcfcfb"

# Sequential (one hue, light -> dark) and diverging (blue <-> gray <-> red)
SEQ_BLUE = LinearSegmentedColormap.from_list(
    "seq_blue", ["#f4f8fd", "#cde2fb", "#86b6ef", "#3987e5", "#256abf", "#104281", "#0d366b"])
DIVERGING = LinearSegmentedColormap.from_list(
    "div_blue_red", ["#104281", "#3987e5", "#9ec5f4", "#f0efec", "#f2a7a6", "#e34948", "#9e1f1f"])


def set_style():
    mpl.rcParams.update({
        "figure.facecolor": SURFACE, "axes.facecolor": SURFACE, "savefig.facecolor": SURFACE,
        "figure.dpi": 110, "savefig.dpi": 150, "savefig.bbox": "tight",
        "font.family": ["Segoe UI", "DejaVu Sans", "sans-serif"], "font.size": 10.5,
        "text.color": INK, "axes.labelcolor": INK_2, "axes.titlecolor": INK,
        "axes.titlesize": 12.5, "axes.titleweight": "semibold", "axes.titlelocation": "left",
        "axes.edgecolor": AXIS, "axes.linewidth": 0.8,
        "axes.spines.top": False, "axes.spines.right": False,
        "axes.grid": True, "grid.color": GRID, "grid.linewidth": 0.6, "axes.axisbelow": True,
        "xtick.color": MUTED, "ytick.color": MUTED, "xtick.labelcolor": INK_2, "ytick.labelcolor": INK_2,
        "legend.frameon": False, "legend.fontsize": 9.5,
        "axes.prop_cycle": mpl.cycler(color=PALETTE),
        "lines.linewidth": 2, "patch.linewidth": 0,
    })


def savefig(fig, name):
    """Save a figure into reports/figures (also copied to the website later)."""
    path = FIGURES / f"{name}.png"
    fig.savefig(path)
    return path


set_style()
