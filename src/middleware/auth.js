const crypto = require('crypto');

function createAuthMiddleware(config) {
    function requireAuth(req, res, next) {
        if (req.session && req.session.authenticated) {
            return next();
        }
        return res.redirect('/login');
    }

    function login(req, res) {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.render('login', { error: 'Please enter both username and password.' });
        }

        const usernameMatch = timingSafeCompare(username, config.dashboard.username);
        const inputHash = crypto.scryptSync(password, config.dashboard.sessionSecret, 64);
        const passwordMatch = crypto.timingSafeEqual(inputHash, config.dashboard.passwordHash);

        if (usernameMatch && passwordMatch) {
            req.session.authenticated = true;
            req.session.loginTime = Date.now();
            return res.redirect('/');
        } else {
            // Small delay to slow down brute force
            setTimeout(() => {
                return res.render('login', { error: 'Invalid username or password.' });
            }, 1000);
        }
    }

    function logout(req, res) {
        req.session.destroy((err) => {
            if (err) console.error('[Auth] Session destroy failed:', err);
            res.redirect('/login');
        });
    }

    return { requireAuth, login, logout };
}

function timingSafeCompare(a, b) {
    const bufA = Buffer.from(String(a));
    const bufB = Buffer.from(String(b));

    if (bufA.length !== bufB.length) {
        // Compare against self to keep constant time, then return false
        crypto.timingSafeEqual(bufA, bufA);
        return false;
    }

    return crypto.timingSafeEqual(bufA, bufB);
}

module.exports = { createAuthMiddleware };
