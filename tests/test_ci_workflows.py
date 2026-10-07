import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]


class CIWorkflowArchitectureTests(unittest.TestCase):
    def read(self, relative: str) -> str:
        return (ROOT / relative).read_text(encoding="utf-8")

    def test_pages_deploy_is_deterministic_and_never_mutates_source_branch(self):
        workflow = self.read(".github/workflows/pages.yml")
        self.assertIn("ref: ${{ github.sha }}", workflow)
        self.assertIn("Verify committed preservation snapshot", workflow)
        self.assertNotIn("Import recovered simulator once", workflow)
        self.assertNotIn("git push origin HEAD:bonaqu_projects", workflow)
        self.assertNotIn("SOURCE_REPOSITORY:", workflow)

    def test_pages_deploy_has_fail_closed_release_notes_fast_path(self):
        workflow = self.read(".github/workflows/pages.yml")
        self.assertIn("Last successful Pages deployment", workflow)
        self.assertIn("scripts/deploy_change_policy.py --stdin", workflow)
        self.assertIn("deployment_sensitive=true", workflow)
        self.assertIn(".github/workflows/*|.github/actions/*|scripts/build_pages.py|scripts/deploy_change_policy.py", workflow)
        self.assertIn("Run release-note fast checks", workflow)
        self.assertIn("Validate generated What's new payload", workflow)
        self.assertIn("steps.gate.outputs.mode != 'release-notes'", workflow)

    def test_cancelled_deploy_followups_can_reuse_every_validated_runtime_commit(self):
        workflow = self.read(".github/workflows/pages.yml")
        self.assertIn('git rev-list --first-parent --reverse "$baseline_sha..$DEPLOY_SHA"', workflow)
        self.assertIn("all_runtime_validated=true", workflow)
        self.assertIn("Runtime commit $commit is covered by successful Feature CI", workflow)
        self.assertIn("mode=validated-runtime", workflow)
        self.assertIn("At least one runtime change since the deployed baseline lacks reusable validation", workflow)

    def test_expensive_production_matrix_only_runs_when_full_validation_is_required(self):
        workflow = self.read(".github/workflows/pages.yml")
        expensive = (
            "Install bundled browsers for fallback validation",
            "Run complete desktop workspace contract on untrusted push",
            "Run shipped browser contract tests on untrusted push",
            "Audit every selectable source catalog record on untrusted push",
            "Run cross-browser smoke tests on untrusted push",
            "Run visual QA on untrusted push",
        )
        for name in expensive:
            with self.subTest(name=name):
                position = workflow.index("- name: " + name)
                block = workflow[position : position + 260]
                self.assertIn("if: steps.gate.outputs.full_validation == 'true'", block)

    def test_feature_ci_reuses_the_same_documentation_policy(self):
        workflow = self.read(".github/workflows/feature-ci.yml")
        self.assertIn("scripts/deploy_change_policy.py --stdin", workflow)
        self.assertIn("if: needs.classify.outputs.docs_only != 'true'", workflow)
        self.assertIn("Run documentation and release-note tests", workflow)
        self.assertIn("tests.test_deploy_change_policy", workflow)


if __name__ == "__main__":
    unittest.main()
