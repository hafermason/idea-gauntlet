import importlib.util
import os
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location(
    "workspace", os.path.join(HERE, "..", "skills", "idea-gauntlet", "workspace.py"))
ws = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ws)


def write(root, rel, text="x"):
    path = os.path.join(root, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        f.write(text)


class WorkspaceTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = self.tmp.name

    def tearDown(self):
        self.tmp.cleanup()

    def test_new_switch_keeps_files(self):
        ws.new(self.root, "alpha")
        write(self.root, "founder/idea.md", "alpha idea")
        ws.new(self.root, "beta")
        self.assertEqual(ws.active_slug(self.root), "beta")
        self.assertTrue(os.path.isfile(os.path.join(self.root, "ideas", "alpha", "idea.md")))
        ws.switch(self.root, "alpha")
        with open(os.path.join(self.root, "founder", "idea.md")) as f:
            self.assertEqual(f.read(), "alpha idea")
        self.assertTrue(os.path.isdir(os.path.join(self.root, "ideas", "beta")))

    def test_refuses_duplicates_bad_slugs_and_unnamed(self):
        ws.new(self.root, "alpha")
        with self.assertRaises(SystemExit):
            ws.new(self.root, "alpha")
        with self.assertRaises(SystemExit):
            ws.new(self.root, "Bad Slug")
        with self.assertRaises(SystemExit):
            ws.switch(self.root, "missing")
        os.remove(os.path.join(self.root, "founder", ws.MARK))
        with self.assertRaises(SystemExit):
            ws.park(self.root)
        self.assertTrue(os.path.isdir(os.path.join(self.root, "founder")))

    def test_status_reads_stage_verdict_and_log(self):
        ws.new(self.root, "alpha")
        write(self.root, "founder/idea.md")
        write(self.root, "founder/board.md")
        write(self.root, "founder/panel/results.md")
        write(self.root, "founder/business-plan.md", "# Plan\n\n**Verdict: Not yet**\n")
        write(self.root, "founder/gauntlet.md", "Status: running\nStatus: killed at consumer\n")
        ws.park(self.root)
        (row,) = ws.status(self.root)
        self.assertEqual(row["slug"], "alpha")
        self.assertFalse(row["active"])
        self.assertEqual(row["stages_done"], ["board", "consumer", "plan"])
        self.assertEqual(row["verdict"], "Not yet")
        self.assertEqual(row["status"], "killed at consumer")


if __name__ == "__main__":
    unittest.main()
