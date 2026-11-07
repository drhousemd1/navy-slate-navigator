"""Offline guards only: no runtime, network, credentials or hosted changes."""
import importlib.util
from pathlib import Path
import shutil
import tempfile
import unittest

APP = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('release', APP / 'scripts/prepare-release.py')
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)


class ReleaseConfiguration(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.app = Path(self.temp.name)
        (self.app / 'supabase').mkdir()
        shutil.copyfile(APP / 'supabase/config.toml', self.app / 'supabase/config.toml')
        for name in release.RETIRED + release.APPLICATION + release.DEFERRED:
            directory = self.app / 'supabase/functions' / name
            directory.mkdir(parents=True)
            (directory / 'index.ts').write_text('// No executable fixture code.\n')
        for name in ('account-deletion', 'encyclopedia-admin', 'app-branding'):
            shutil.copyfile(APP / 'supabase/functions' / name / 'config.toml', self.app / 'supabase/functions' / name / 'config.toml')

    def tearDown(self):
        self.temp.cleanup()

    def rewrite(self, old, new):
        path = self.app / 'supabase/config.toml'
        value = path.read_text()
        self.assertIn(old, value)
        path.write_text(value.replace(old, new, 1))

    def test_actual_template_and_all_handler_fragments_agree(self):
        self.assertEqual(release.check(APP)['functions']['account-deletion']['verify_jwt'], False)

    def test_plan_is_explicit_target_named_functions_and_has_no_execution_mode(self):
        result = release.plan('qzmxncbvalskdjfhgprt', 'https://release.obedience.app/', self.app)
        self.assertFalse(result['deploymentPerformed'])
        self.assertFalse(result['releaseAccepted'])
        self.assertEqual(result['requiredEnvironment'][release.ENV_KEYS[2]], 'https://release.obedience.app/reset-password')
        self.assertEqual(result['cliVersion'], '2.122.0')
        for step in result['stepsAfterTargetReviewAndMaintenance']:
            argv = step['argv']
            self.assertEqual(argv[argv.index('--project-ref') + 1], result['projectRef'])
            self.assertNotIn('--prune', argv)
            self.assertNotIn('--no-verify-jwt', argv)
            for name in release.DEFERRED:
                self.assertNotIn(name, argv)
        self.assertEqual(result['excludedFunctions'], list(release.DEFERRED))

    def test_missing_or_placeholder_projects_fail_closed(self):
        for value in (None, '', 'ronqvzih', 'abcdefghijklmnopqrst', 'a' * 20, 'replacethisprojectref', '--remote'):
            with self.subTest(value=value), self.assertRaises(ValueError):
                release.plan(value, 'https://release.obedience.app', self.app)

    def test_local_unsafe_and_placeholder_origins_fail_closed(self):
        for value in ('', 'http://app.com', 'https://127.0.0.1', 'https://localhost', 'https://app.invalid',
                      'https://example.com', 'https://replace-app.com', 'https://app.com:5176',
                      'https://user@app.com', 'https://app.com/auth', 'https://app.com?next=other',
                      'https://app.com#fragment', 'https://*.app.com', 'https://app.com\n', 'https://APP.com'):
            with self.subTest(value=value), self.assertRaises(ValueError):
                release.origin(value)

    def test_deletion_gateway_cannot_block_capability_recovery(self):
        self.rewrite('[functions.account-deletion]\nenabled = true\nverify_jwt = false',
                     '[functions.account-deletion]\nenabled = true\nverify_jwt = true')
        with self.assertRaisesRegex(ValueError, 'account-deletion'):
            release.check(self.app)

    def test_active_function_cannot_be_silently_disabled(self):
        self.rewrite('[functions.message-media]\nenabled = true', '[functions.message-media]\nenabled = false')
        with self.assertRaisesRegex(ValueError, 'message-media'):
            release.check(self.app)

    def test_boolean_flags_must_not_be_toml_numbers(self):
        self.rewrite('enabled = true', 'enabled = 1')
        with self.assertRaisesRegex(ValueError, 'message-media'):
            release.check(self.app)

    def test_legacy_and_push_endpoints_cannot_be_silently_enabled(self):
        for name in release.DEFERRED:
            with self.subTest(name=name):
                path = self.app / 'supabase/config.toml'
                original = path.read_text()
                self.rewrite('[functions.' + name + ']\nenabled = false', '[functions.' + name + ']\nenabled = true')
                with self.assertRaisesRegex(ValueError, name):
                    release.check(self.app)
                path.write_text(original)

    def test_extra_config_and_competing_json_are_rejected(self):
        self.rewrite('project_id = "obedience"', 'project_id = "obedience"\nsite_url = "https://old.app"')
        with self.assertRaises(ValueError):
            release.check(self.app)
        shutil.copyfile(APP / 'supabase/config.toml', self.app / 'supabase/config.toml')
        (self.app / 'supabase/config.json').write_text('{}')
        with self.assertRaisesRegex(ValueError, 'compete'):
            release.check(self.app)

    def test_unreviewed_fragment_or_missing_handler_stops_plan(self):
        fragment = self.app / 'supabase/functions/app-branding/config.toml'
        fragment.write_text('[functions.app-branding]\nverify_jwt = true\n')
        with self.assertRaisesRegex(ValueError, 'fragment'):
            release.check(self.app)
        shutil.copyfile(APP / 'supabase/functions/app-branding/config.toml', fragment)
        (self.app / 'supabase/functions/account-deletion/index.ts').unlink()
        with self.assertRaisesRegex(ValueError, 'entrypoint'):
            release.check(self.app)


if __name__ == '__main__':
    unittest.main()
