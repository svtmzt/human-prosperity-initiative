import importlib.util
import math
from pathlib import Path
import unittest
spec = importlib.util.spec_from_file_location("trial", Path(__file__).resolve().parents[1]/"scripts/ai-trial-reproduction.py")
trial = importlib.util.module_from_spec(spec)
spec.loader.exec_module(trial)

class Trial(unittest.TestCase):
    def test_known_difference_and_cluster_se(self):
        rows = [(1,"black",0),(1,"white",1),(2,"black",1),(2,"white",0),(3,"black",0),(3,"white",1)]
        r=trial.reproduce(rows)
        self.assertAlmostEqual(r["difference"], 1/3)
        self.assertAlmostEqual(r["cluster_robust_cr1_se"], math.sqrt((4/81+16/81+4/81)*1.5*1.25))
        self.assertEqual(r["advertisement_clusters"],3)
        self.assertTrue(r["independent_grouped_contrast_cross_check"])
        self.assertFalse(r["publication_authorised"])
    def test_unequal_cluster_size_balanced_arms(self):
        rows=[(1,"black",0),(1,"white",1),(2,"black",1),(2,"black",0),(2,"white",0),(2,"white",0)]
        r=trial.reproduce(rows)
        self.assertAlmostEqual(r["difference"], 0)
        self.assertTrue(r["independent_grouped_contrast_cross_check"])
        self.assertGreater(r["cluster_robust_cr1_se"],0)
    def test_invalid_design(self):
        with self.assertRaises(ValueError):
            trial.reproduce([(1,"black",0),(1,"white",1),(2,"white",1),(2,"white",1)])
    def test_invalid_outcome(self):
        with self.assertRaises(ValueError):
            trial.reproduce([(1,"black",0),(1,"white",2),(2,"black",1),(2,"white",0)])
    def test_degenerate(self):
        with self.assertRaises(ValueError):
            trial.reproduce([(1,"black",0),(1,"white",1),(2,"black",0),(2,"white",1)])
    def test_unknown_source(self):
        with self.assertRaises(ValueError):
            trial.read_source("https://example.com")
    def test_table1_reference(self):
        self.assertTrue(trial.verify_table1({"observations":4870,"arms":{"white":{"n":2435,"rate":235/2435},"black":{"n":2435,"rate":157/2435}},"difference":78/2435,"risk_ratio":235/157}))
if __name__ == "__main__":
    unittest.main()
