"""MPS Auth — Full backend test suite"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

ADMIN_EMAIL = "admin@mps.edu.au"
ADMIN_PASSWORD = "Admin1234!"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def auth(session):
    """Login and return access_token + session with cookie"""
    res = session.post(f"{BASE_URL}/api/login/", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert res.status_code == 200, f"Login failed: {res.text}"
    token = res.json()["access_token"]
    session.headers.update({"Authorization": f"Bearer {token}"})
    return token


# ── 1. Root health check ─────────────────────────────────────────────────────
class TestHealth:
    def test_root(self, session):
        # Root at external URL serves React frontend HTML; test backend via known API endpoint
        res = requests.get("http://localhost:8001/")
        assert res.status_code == 200
        data = res.json()
        assert data.get("service") == "MPS Auth"
        print("PASS: root health check")


# ── 2. Onboarding ─────────────────────────────────────────────────────────────
class TestOnboarding:
    def test_status(self, session):
        res = session.get(f"{BASE_URL}/api/onboarding/status")
        assert res.status_code == 200
        data = res.json()
        assert "needs_onboarding" in data
        print(f"PASS: onboarding status — {data}")

    def test_setup_blocked_when_done(self, session):
        res = session.post(f"{BASE_URL}/api/onboarding/setup", json={
            "email": "second@mps.edu.au", "password": "Test1234!", "full_name": "Second"
        })
        assert res.status_code == 403, f"Expected 403 but got {res.status_code}: {res.text}"
        print("PASS: onboarding setup blocked after first admin")


# ── 3. Auth flows ──────────────────────────────────────────────────────────────
class TestAuth:
    def test_login_valid(self, session):
        res = session.post(f"{BASE_URL}/api/login/", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert res.status_code == 200
        data = res.json()
        assert "access_token" in data
        assert isinstance(data["access_token"], str) and len(data["access_token"]) > 10
        print("PASS: login valid")

    def test_login_invalid(self, session):
        s2 = requests.Session()
        res = s2.post(f"{BASE_URL}/api/login/", json={"email": ADMIN_EMAIL, "password": "WrongPass!"})
        assert res.status_code == 401
        print("PASS: login invalid returns 401")

    def test_token_refresh(self, session, auth):
        res = session.post(f"{BASE_URL}/api/token/refresh/", json={})
        assert res.status_code == 200
        data = res.json()
        assert "access_token" in data
        print("PASS: token refresh")

    def test_verify(self, session, auth):
        res = session.get(f"{BASE_URL}/api/verify/")
        assert res.status_code == 200
        data = res.json()
        assert "user" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        print("PASS: verify endpoint")


# ── 4. Apps ────────────────────────────────────────────────────────────────────
class TestApps:
    def test_list_apps(self, session, auth):
        res = session.get(f"{BASE_URL}/api/apps/")
        assert res.status_code == 200
        apps = res.json()
        slugs = [a["slug"] for a in apps]
        for expected in ["welltrack", "beeshopkiosk", "psychscheduler"]:
            assert expected in slugs, f"{expected} missing from apps"
        print(f"PASS: apps list — {slugs}")


# ── 5. Users ───────────────────────────────────────────────────────────────────
class TestUsers:
    def test_list_users(self, session, auth):
        res = session.get(f"{BASE_URL}/api/users/")
        assert res.status_code == 200
        data = res.json()
        # Paginated response uses 'items' key
        assert "items" in data or "users" in data or isinstance(data, list)
        print("PASS: users list")

    def test_create_user(self, session, auth):
        import time
        unique_email = f"test_user_{int(time.time())}@mps.edu.au"
        payload = {"email": unique_email, "password": "Test1234!", "full_name": "Test User", "role": "viewer"}
        res = session.post(f"{BASE_URL}/api/users/", json=payload)
        assert res.status_code in [200, 201], f"Create user failed: {res.text}"
        data = res.json()
        assert data.get("email") == unique_email.lower()
        print(f"PASS: create user — id={data.get('id')}")
        return data.get("id")


# ── 6. Students ────────────────────────────────────────────────────────────────
class TestStudents:
    def test_list_students(self, session, auth):
        res = session.get(f"{BASE_URL}/api/students/")
        assert res.status_code == 200
        print("PASS: students list")

    def test_create_student(self, session, auth):
        import time
        sid = f"TEST{int(time.time())}"
        payload = {"student_id": sid, "first_name": "TestFirst", "last_name": "TestLast", "year_level": "10", "class_group": "10A"}
        res = session.post(f"{BASE_URL}/api/students/", json=payload)
        assert res.status_code in [200, 201], f"Create student failed: {res.text}"
        data = res.json()
        assert data.get("student_id") == sid
        print("PASS: create student")


# ── 7. Audit ───────────────────────────────────────────────────────────────────
class TestAudit:
    def test_audit_log(self, session, auth):
        res = session.get(f"{BASE_URL}/api/audit/")
        assert res.status_code == 200
        data = res.json()
        events = data if isinstance(data, list) else data.get("events", data.get("items", []))
        actions = [e.get("action") for e in events]
        assert any("LOGIN" in str(a).upper() for a in actions), f"No LOGIN action found. Actions: {actions}"
        print(f"PASS: audit log has LOGIN events")


# ── 8. Logout ──────────────────────────────────────────────────────────────────
class TestLogout:
    def test_logout(self, session, auth):
        res = session.post(f"{BASE_URL}/api/logout/", json={})
        assert res.status_code in [200, 204]
        print("PASS: logout")
