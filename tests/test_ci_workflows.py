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
        self.assertIn(".github/workflows/pages.yml|.github/workflows/feature-ci.yml|.github/actions/*|scripts/build_pages.py|scripts/deploy_change_policy.py", workflow)
        self.assertNotIn(".github/workflows/*|.github/actions/*", workflow)
        self.assertIn("Run release-note fast checks", workflow)
        self.assertIn("Validate generated What's new payload", workflow)
        self.assertIn("release.highlights?.ru", workflow)
        self.assertNotIn("release.notes?.ru", workflow)
        self.assertIn("steps.gate.outputs.mode != 'release-notes'", workflow)

    def test_cancelled_deploy_followups_can_reuse_every_validated_runtime_commit(self):
        workflow = self.read(".github/workflows/pages.yml")
        self.assertIn('git rev-list --first-parent --reverse "$baseline_sha..$DEPLOY_SHA"', workflow)
        self.assertIn("all_runtime_validated=true", workflow)
        self.assertIn("Runtime commit $commit is covered by successful Feature CI", workflow)
        self.assertIn("mode=validated-runtime", workflow)
        self.assertIn("deployment-infrastructure-changed-require-pr-evidence", workflow)
        self.assertIn("force_full_deploy=false", workflow)
        self.assertIn('repos/$REPOSITORY/actions/runs/$successful_run_id/jobs?per_page=100', workflow)
        self.assertIn('.name == "test" and .conclusion == "success"', workflow)
        self.assertIn('.name == "cross_browser_webkit" and .conclusion == "success"', workflow)
        self.assertIn('.name == "browser_core (3)" and .conclusion == "success"', workflow)
        self.assertIn("At least one runtime change since the deployed baseline lacks reusable validation", workflow)

    def test_production_validation_budget_allows_full_suite_to_finish(self):
        workflow = self.read(".github/workflows/pages.yml")
        # The prior full Pages build reached the last WebKit/Firefox smoke
        # tests at ~20m and was cancelled before it could publish.
        self.assertIn("    timeout-minutes: 35", workflow)

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

    def test_feature_ci_routes_focused_change_profiles(self):
        workflow = self.read(".github/workflows/feature-ci.yml")
        self.assertIn("translation_only:", workflow)
        self.assertIn("catalog_data:", workflow)
        self.assertIn("admin_only:", workflow)
        self.assertIn("Run focused localization contract", workflow)
        self.assertIn("Audit source catalog shard", workflow)
        self.assertIn("admin_contract:", workflow)
        self.assertIn("Verify Admin API contracts", workflow)
        self.assertIn("needs.classify.outputs.admin_only != 'true'", workflow)

    def test_asset_only_prs_run_visual_and_cross_browser_without_gameplay_matrices(self):
        workflow = self.read(".github/workflows/feature-ci.yml")
        self.assertIn("modern/*.css|css/*|image/*|*.md|docs/*|.github/ISSUE_TEMPLATE/*", workflow)
        self.assertNotIn("image/*|tests/ui/*.spec.mjs", workflow)
        for job in ("browser_core",):
            section = workflow.split("  " + job + ":")[1].split("\n  catalog_audit:", 1)[0]
            self.assertIn("needs.classify.outputs.css_only != 'true'", section)
        self.assertIn("Run complete desktop workspace contract\n        if: needs.classify.outputs.css_only != 'true'", workflow)
        self.assertIn("Capture desktop and mobile visual QA", workflow)
        self.assertIn("Run firefox smoke tests", workflow)
        self.assertIn("Run webkit smoke tests", workflow)

    def test_feature_ci_deduplicates_push_when_open_pr_exists(self):
        workflow = self.read(".github/workflows/feature-ci.yml")
        self.assertIn("pull-requests: read", workflow)
        self.assertIn("Detect open PR for feature push", workflow)
        self.assertIn("Open PR already validates $BRANCH; skipping duplicate push matrix.", workflow)
        self.assertIn("duplicate_pr:", workflow)
        self.assertIn("if: needs.classify.outputs.duplicate_pr != 'true'", workflow)
        self.assertIn("ci_profile=duplicate-pr", workflow)

    def test_admin_workflow_is_not_pages_deployment_infrastructure(self):
        workflow = self.read(".github/workflows/pages.yml")
        sensitive_case = ".github/workflows/pages.yml|.github/workflows/feature-ci.yml|.github/actions/*|scripts/build_pages.py|scripts/deploy_change_policy.py"
        self.assertIn(sensitive_case, workflow)
        self.assertNotIn(".github/workflows/admin-api.yml|.github/actions/*", workflow)


if __name__ == "__main__":
    unittest.main()
