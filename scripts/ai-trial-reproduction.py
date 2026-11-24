"""Bounded empirical reproduction using an explicitly pinned published teaching dataset.
No original data rows, names, advert IDs or raw source files are retained or sent to AI.
Only the randomized name signal and callback outcome are analysed; never infer actual race,
hiring, income, population-wide effects, or permission for field action.
"""
import argparse
import collections
import hashlib
import json
import math
import os
from pathlib import Path
import tempfile
import urllib.request

REV = "be3dc62dd51954975085c7520fd5967226a195b1"
BASE = f"https://raw.githubusercontent.com/OpenIntroStat/openintro/{REV}/"
SOURCES = {
    "DESCRIPTION": "3c22555f2ac0f0e9626f1d23e7bbdcfb1b3746197b21cc461e73099e87d5a699",
    "LICENSE.md": "dd52d263a14c3d030fd2ddc39dc174eb22038ed1921bc98736992db0f98ce105",
    "data/resume.rda": "faf8da55c741deea1f5d31e0bfbea16b11b969dd1d8b34e439dee58f6c23c078",
}
PAPER = "https://doi.org/10.1257/0002828042002561"
PACKAGE = "https://github.com/OpenIntroStat/openintro/tree/" + REV
Z95 = 1.959963984540054

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None

def read_source(name):
    if name not in SOURCES:
        raise ValueError("Not an approved source")
    with urllib.request.build_opener(NoRedirect).open(BASE + name, timeout=15) as response:
        if response.status != 200:
            raise ValueError("Unexpected source status")
        data = response.read(100001)
    if len(data) > 100000 or hashlib.sha256(data).hexdigest() != SOURCES[name]:
        raise ValueError("Unapproved source bytes")
    return data

def reproduce(rows):
    """Two-group OLS difference, cluster-robust CR1 sandwich with normal reference.
    Each record is (anonymous advertisement ID, assigned name category, binary callback).
    Require balanced assignment within advertisements; unsupported designs refuse.
    """
    if not 4 <= len(rows) <= 10000:
        raise ValueError("Unsupported sample size")
    n = len(rows)
    sizes = collections.Counter()
    sums = collections.Counter()
    groups = collections.defaultdict(collections.Counter)
    for ad, arm, y in rows:
        if ad is None or not isinstance(ad, (int, str)) or not str(ad).strip() or len(str(ad)) > 32:
            raise ValueError("Invalid advertisement identifier")
        if arm not in ("black", "white") or y not in (0, 1):
            raise ValueError("Unexpected assignment or outcome")
        sizes[arm] += 1
        sums[arm] += y
        groups[ad][arm] += 1
    if any(g["black"] != g["white"] or g["black"] not in (1, 2) for g in groups.values()):
        raise ValueError("Unsupported within-ad allocation")
    G = len(groups)
    if G < 2 or not all(sizes.values()):
        raise ValueError("Insufficient clusters")
    means = {a: sums[a] / sizes[a] for a in ("black", "white")}
    delta = means["white"] - means["black"]
    scores = collections.defaultdict(float)
    cluster_callbacks = collections.defaultdict(collections.Counter)
    for ad, arm, y in rows:
        scores[ad] += (y - means[arm]) / sizes[arm] * (1 if arm == "white" else -1)
        cluster_callbacks[ad][arm] += y
    variance = sum(v*v for v in scores.values()) * G/(G-1) * (n-1)/(n-2)
    # Independent grouped contrast calculation for the verified balanced design.
    # Weight each advertisement by its per-arm number of sent resumes.
    arm_n = sizes["white"]
    grouped_delta = sum(v["white"] - v["black"] for v in cluster_callbacks.values()) / arm_n
    grouped_variance = sum((cluster_callbacks[ad]["white"] - cluster_callbacks[ad]["black"] -
                            groups[ad]["white"] * grouped_delta)**2 for ad in groups)
    grouped_variance *= G/(G-1) * (n-1)/(n-2) / arm_n**2
    if not (math.isclose(grouped_delta, delta, rel_tol=1e-12, abs_tol=1e-14) and
            math.isclose(grouped_variance, variance, rel_tol=1e-12, abs_tol=1e-14)):
        raise ValueError("Independent grouped contrast calculation disagrees")
    se = math.sqrt(variance)
    if se == 0:
        raise ValueError("Degenerate variance: inference refused")
    return {
        "observations": n, "advertisement_clusters": G,
        "cluster_size_distribution": dict(collections.Counter(sum(x.values()) for x in groups.values())),
        "balanced_within_advertisement": True,
        "arms": {a: {"n": sizes[a], "callbacks": sums[a], "rate": means[a]} for a in means},
        "difference": delta, "risk_ratio": means["white"]/means["black"] if means["black"] else None,
        "cluster_robust_cr1_se": se,
        "independent_grouped_contrast_cross_check": True,
        "normal_approximation_95_ci": [delta-Z95*se, delta+Z95*se],
        "normal_approximation_two_sided_p": math.erfc(abs(delta/se)/math.sqrt(2)),
        "estimand": "callback probability difference for assigned perceived-name categories",
        "inference_method": "unadjusted two-arm OLS difference; CR1 clustered on job advertisement; normal approximation",
        "full_original_analysis_replicated": False,
        "actual_person_race_inferred": False,
        "publication_authorised": False,
    }

def verify_table1(out):
    a = out["arms"]
    return (out["observations"] == 4870 and
            a["white"]["n"] == a["black"]["n"] == 2435 and
            round(100*a["white"]["rate"], 2) == 9.65 and
            round(100*a["black"]["rate"], 2) == 6.45 and
            round(100*out["difference"], 2) == 3.20 and
            round(out["risk_ratio"], 2) == 1.50)

def run():
    import pyreadr
    import sys
    import pandas
    import numpy
    if pyreadr.__version__ != "0.5.4":
        raise ValueError("Unapproved parser version")
    desc = read_source("DESCRIPTION")
    license_bytes = read_source("LICENSE.md")
    if b"License: GPL-3" not in desc or b"GNU General Public License" not in license_bytes:
        raise ValueError("Package licence mismatch")
    data = read_source("data/resume.rda")
    with tempfile.TemporaryDirectory(prefix="hpi-rda-") as d:
        p = Path(d)/"resume.rda"
        with p.open("xb") as f:
            os.fchmod(f.fileno(), 0o600)
            f.write(data)
        obj = pyreadr.read_r(str(p))
        if list(obj) != ["resume"] or obj["resume"].shape != (4870, 30):
            raise ValueError("Unexpected published dataset")
        df = obj["resume"][["job_ad_id","race","received_callback"]]
        if df.isna().any().any():
            raise ValueError("Missing outcome or assignment: no silent exclusions")
        rows = []
        for ad, arm, y in df.itertuples(index=False, name=None):
            # Avoid coercing nonbinary outcomes to a valid integer.
            if not math.isfinite(float(ad)) or float(ad) != int(ad) or y not in (0, 1):
                raise ValueError("Unexpected experimental row")
            rows.append((int(ad), str(arm), int(y)))
        result = reproduce(rows)
    if not verify_table1(result):
        raise ValueError("Published Table 1 does not match")
    return {"schema": "hpi_ai6_t073b2_trial_reproduction_v1",
            "source_study": PAPER, "source_table": "Table 1, all sent resumes, page 997",
            "teaching_dataset": PACKAGE, "author_replication_registry": "https://doi.org/10.3886/E116023V1",
            "source_version": REV, "source_sha256": SOURCES,
            "package_license": "GPL-3; no dataset redistribution or assertion of separate original-data licence",
            "original_author_archive_directly_retrieved": False,
            "derived_teaching_release_used": True, "table1_rounded_statistics_match": True,
            "runtime": {"python": sys.version.split()[0], "pyreadr": pyreadr.__version__,
                        "pandas": pandas.__version__, "numpy": numpy.__version__},
            "private_rows_retained": False, "raw_data_sent_to_models": False,
            "public_source_gets": 3, "paid_ai_calls": 0,
            "result": result,
            "limitations": ["Historical study of fictitious resumes in Boston and Chicago, not actual hiring or wages.",
                            "CR1 estimate is an additional large-sample check, not a reconstruction of every original model.",
                            "No employer identification, subgroup targeting, or scientific publication clearance.",
                            "One study and one teaching dataset; no generalisation to SNAP/EITC or all HPI tasks."]}

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["plan", "run"])
    parser.add_argument("--allow-public-data", action="store_true")
    args = parser.parse_args()
    if args.action == "plan":
        print(json.dumps({"source": PACKAGE, "sha256": SOURCES, "max_gets": 3, "paid_ai_calls": 0}, indent=2))
    elif not args.allow_public_data:
        parser.error("--allow-public-data required")
    else:
        print(json.dumps(run(), indent=2))
