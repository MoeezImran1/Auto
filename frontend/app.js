const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8000'
    : window.location.origin; // Uses full domain (e.g., https://auto-p7x5.vercel.app) for integration URLs

document.addEventListener('DOMContentLoaded', () => {
    // Navigation
    const navSetup = document.getElementById('navSetup');
    const navDashboard = document.getElementById('navDashboard');
    const navTemplates = document.getElementById('navTemplates');
    const navIntegration = document.getElementById('navIntegration');

    const setupSection = document.getElementById('setupSection');
    const dashboardSection = document.getElementById('dashboardSection');
    const templatesSection = document.getElementById('templatesSection');
    const integrationSection = document.getElementById('integrationSection');

    // Forms & Inputs
    const setupForm = document.getElementById('setupForm');
    const btnTestConn = document.getElementById('btnTestConn');
    const toastContainer = document.getElementById('toastContainer');

    // Test Email Modal
    const modal = document.getElementById('testEmailModal');
    const btnSendTestEmail = document.getElementById('btnSendTestEmail');
    let currentTestDomain = '';

    // Load Local Storage to persist setup forms natively
    const savedCredsStr = localStorage.getItem('mailbridge_creds');
    if (savedCredsStr) {
        try {
            const saved = JSON.parse(savedCredsStr);
            document.getElementById('domainName').value = saved.domain || '';
            document.getElementById('senderName').value = saved.sender_name || '';
            document.getElementById('emailAddress').value = saved.email || '';
            document.getElementById('smtpHost').value = saved.smtp_host || '';
            document.getElementById('smtpPort').value = saved.smtp_port || '';
            document.getElementById('smtpPassword').value = saved.password || '';
            document.getElementById('logoUrl').value = saved.logo_url || '';
        } catch (e) { }
    }

    // Navigation Logic
    function switchSection(activeNav, activeSection) {
        [navSetup, navDashboard, navTemplates, navIntegration].forEach(nav => nav.classList.remove('active'));
        activeNav.classList.add('active');

        [setupSection, dashboardSection, templatesSection, integrationSection].forEach(sec => {
            sec.classList.remove('active');
            sec.classList.add('hidden');
        });
        activeSection.classList.remove('hidden');
        activeSection.classList.add('active');

        if (activeSection === dashboardSection || activeSection === templatesSection || activeSection === integrationSection) {
            loadDomains();
        }
    }

    navSetup.addEventListener('click', () => switchSection(navSetup, setupSection));
    navDashboard.addEventListener('click', () => switchSection(navDashboard, dashboardSection));
    navTemplates.addEventListener('click', () => switchSection(navTemplates, templatesSection));
    navIntegration.addEventListener('click', () => switchSection(navIntegration, integrationSection));

    // Toast Functionality
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        let icon = type === 'success'
            ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`
            : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;

        toast.innerHTML = `${icon} <span>${message}</span>`;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-in forwards';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    // Connect Email Setup
    setupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        saveEmailSettings();
    });

    // Test Connection Button in Setup
    btnTestConn.addEventListener('click', () => {
        const domain = document.getElementById('domainName').value;
        const email = document.getElementById('emailAddress').value;
        if (!domain || !email) {
            showToast('Enter domain and email at least to test if they exist, but requires full save to test SMTP properly via backend', 'error');
            return;
        }
        // Instead of testing raw SMTP from frontend (impossible), we ask user to save first, then test.
        // Actually, the API returns Connect Email status which validats SMTP.
        saveEmailSettings();
    });

    async function saveEmailSettings() {
        const payload = {
            domain: document.getElementById('domainName').value,
            sender_name: document.getElementById('senderName').value,
            email: document.getElementById('emailAddress').value,
            smtp_host: document.getElementById('smtpHost').value,
            smtp_port: parseInt(document.getElementById('smtpPort').value),
            password: document.getElementById('smtpPassword').value,
            logo_url: document.getElementById('logoUrl').value || null
        };

        // Cache Locally
        localStorage.setItem('mailbridge_creds', JSON.stringify(payload));

        const btnSave = document.getElementById('btnSaveConn');
        const ogText = btnSave.innerText;
        btnSave.innerText = 'Connecting...';
        btnSave.disabled = true;

        try {
            const res = await fetch(`${API_URL}/connect-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const contentType = res.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                const data = await res.json();
                if (!res.ok) throw new Error(data.detail || 'Connection Failed');
            } else {
                const text = await res.text();
                throw new Error('Server Exception: ' + (text.substring(0, 50) || 'Unknown Error'));
            }

            showToast('SMTP Connection Successful & Saved!', 'success');
            setupForm.reset();
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            btnSave.innerText = ogText;
            btnSave.disabled = false;
        }
    }

    // Load Domains into Dashboard & Templates
    async function loadDomains() {
        try {
            const res = await fetch(`${API_URL}/email-settings`);
            let data = await res.json();

            const domainsList = document.getElementById('domainsList');
            const templateSelect = document.getElementById('templateDomainSelect');
            const integrationDomainSelect = document.getElementById('integrationDomainSelect');

            domainsList.innerHTML = '';
            templateSelect.innerHTML = '';
            if (integrationDomainSelect) integrationDomainSelect.innerHTML = '';

            // Auto-restore mechanism for Vercel Ephemeral Storage workaround
            if (data.length === 0) {
                const savedCredsStr = localStorage.getItem('mailbridge_creds');
                if (savedCredsStr) {
                    try {
                        const saved = JSON.parse(savedCredsStr);
                        // Force a restoral of backend state
                        await fetch(`${API_URL}/connect-email`, {
                            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(saved)
                        });
                        const savedTemplatesStr = localStorage.getItem('mailbridge_templates_' + saved.domain);
                        if (savedTemplatesStr) {
                            await fetch(`${API_URL}/email-settings/${saved.domain}`, {
                                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: savedTemplatesStr
                            });
                        }
                        // Refetch after restore
                        const reloadRes = await fetch(`${API_URL}/email-settings`);
                        const reloadData = await reloadRes.json();
                        if (reloadData.length > 0) data = reloadData;
                    } catch (e) { console.error('Restore failed', e); }
                }
            }

            if (data.length === 0) {
                domainsList.innerHTML = '<p>No domains connected yet.</p>';
                return;
            }

            // Populate domains
            data.forEach((setting, index) => {
                // Dashboard Card
                const card = document.createElement('div');
                card.className = 'domain-card';
                card.innerHTML = `
                    <div class="domain-info">
                        <div class="domain-name">${setting.domain}</div>
                        <div class="domain-meta">
                            <span>${setting.email}</span>
                            <span class="status-badge status-connected">SMTP Connected</span>
                        </div>
                    </div>
                    <div class="domain-actions">
                        <button class="btn btn-secondary" onclick="openTestModal('${setting.domain}')">Test Email</button>
                        <button class="btn btn-secondary" onclick="editDomain('${setting.domain}')">Edit</button>
                    </div>
                `;
                domainsList.appendChild(card);

                // Template Select
                const option = document.createElement('option');
                option.value = setting.domain;
                option.textContent = setting.domain;
                templateSelect.appendChild(option);

                // Cache templates locally
                option.dataset.verify = setting.verification_template;
                option.dataset.reset = setting.reset_template;
                option.dataset.logo = setting.logo_url || '';

                if (integrationDomainSelect) {
                    const intOption = document.createElement('option');
                    intOption.value = setting.domain;
                    intOption.textContent = setting.domain;
                    integrationDomainSelect.appendChild(intOption);
                }
            });

            // Initial template load
            loadTemplatesForSelectedDomain();
            if (typeof updateIntegrationCode === 'function') updateIntegrationCode();

        } catch (err) {
            console.error('Failed to load domains:', err);
        }
    }

    // Dashboard Actions (globally accessible functions attached to window)
    window.openTestModal = (domain) => {
        currentTestDomain = domain;
        document.getElementById('testModalDomain').innerText = domain;
        modal.classList.remove('hidden');
    };

    window.closeTestEmailModal = () => {
        modal.classList.add('hidden');
    };

    window.editDomain = (domain) => {
        showToast('Please reconnect via Setup tab to update credentials.', 'success');
        switchSection(navSetup, setupSection);
        document.getElementById('domainName').value = domain;
    };

    // Send Test Email
    btnSendTestEmail.addEventListener('click', async () => {
        const to_email = document.getElementById('testEmailRecipient').value;
        if (!to_email) return showToast('Please enter recipient email', 'error');

        btnSendTestEmail.innerText = 'Sending...';
        btnSendTestEmail.disabled = true;

        try {
            const res = await fetch(`${API_URL}/test-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ domain: currentTestDomain, to_email })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Test sending failed');

            showToast('Test email sent successfully!', 'success');
            window.closeTestEmailModal();
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            btnSendTestEmail.innerText = 'Send Email';
            btnSendTestEmail.disabled = false;
        }
    });

    // Templates Logic
    const templateDomainSelect = document.getElementById('templateDomainSelect');
    const verifyTemplateText = document.getElementById('verifyTemplate');
    const resetTemplateText = document.getElementById('resetTemplate');

    templateDomainSelect.addEventListener('change', loadTemplatesForSelectedDomain);

    function loadTemplatesForSelectedDomain() {
        const selectedOption = templateDomainSelect.options[templateDomainSelect.selectedIndex];
        if (selectedOption) {
            verifyTemplateText.value = selectedOption.dataset.verify || '';
            resetTemplateText.value = selectedOption.dataset.reset || '';
        }
    }

    const presetTemplateSelect = document.getElementById('presetTemplateSelect');
    presetTemplateSelect.addEventListener('change', () => {
        const scheme = presetTemplateSelect.value;
        const selectedOption = templateDomainSelect.options[templateDomainSelect.selectedIndex];
        const logo = selectedOption && selectedOption.dataset.logo ? selectedOption.dataset.logo : 'https://via.placeholder.com/150x50.png?text=Logo';

        if (scheme === 'minimal') {
            verifyTemplateText.value = `<div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
  <h2>Verify your email</h2>
  <p>Please use this verification code to confirm your email address: <strong>{{code}}</strong></p>
</div>`;
            resetTemplateText.value = `<div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
  <h2>Reset Password</h2>
  <p>Please use this OTP code to reset your password. Code expires in 1 hour:</p>
  <h3><strong>{{code}}</strong></h3>
</div>`;
        } else if (scheme === 'saas') {
            verifyTemplateText.value = `<div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 40px auto; background: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center;">
  {% if logo %}<img src="{{logo}}" alt="logo" style="max-height: 48px; margin-bottom: 20px;">{% endif %}
  <div style="width: 60px; height: 60px; background: #E0E7FF; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
    <span style="font-size: 24px; color: #3730A3; font-family: sans-serif;">&#x2709;</span>
  </div>
  <h1 style="color: #111827; font-size: 24px; margin-bottom: 15px;">You're almost there!</h1>
  <p style="color: #6B7280; font-size: 16px; margin-bottom: 20px; line-height: 1.5;">Enter the verification code below to confirm your email address and activate your account.</p>
  <div style="margin-bottom: 30px;">
      <div style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #111827;">{{code}}</div>
  </div>
</div>`;
            resetTemplateText.value = `<div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 40px auto; background: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center;">
  {% if logo %}<img src="{{logo}}" alt="logo" style="max-height: 48px; margin-bottom: 20px;">{% endif %}
  <div style="width: 60px; height: 60px; background: #E0E7FF; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
    <span style="font-size: 24px; color: #3730A3; font-family: sans-serif;">&#x1F512;</span>
  </div>
  <h1 style="color: #111827; font-size: 24px; margin-bottom: 15px;">Reset your password</h1>
  <p style="color: #6B7280; font-size: 16px; margin-bottom: 30px; line-height: 1.5;">We received a request to reset your password. Enter the OTP code below to choose a new one.</p>
  <div style="margin-bottom: 30px;">
      <div style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #111827;">{{code}}</div>
  </div>
  <p style="color: #9CA3AF; font-size: 14px; margin-top: 30px;">If you didn't request this, you can safely ignore this email.</p>
</div>`;
        } else if (scheme === 'brand') {
            verifyTemplateText.value = `<div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 40px auto; background: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; border: 1px solid #e5e7eb;">
  <div style="font-size: 28px; font-weight: 800; color: #09090b; letter-spacing: -1px; text-align: center; margin-bottom: 30px;">
      {% if logo %}<img src="{{logo}}" width="24" height="24" alt="xlinkly logo" style="vertical-align: middle; margin-right: 6px; margin-bottom: 4px;" />{% else %}<img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2309090b' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71'/%3E%3Cpath d='M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'/%3E%3C/svg%3E" width="24" height="24" alt="xlinkly logo" style="vertical-align: middle; margin-right: 6px; margin-bottom: 4px;" />{% endif %}
      <span style="vertical-align: middle;">xlinkly</span>
  </div>
  <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto 24px;">
      <tr>
          <td align="center" valign="middle" width="72" height="72" style="background: #fafafa; border-radius: 20px; border: 1px solid #e4e4e7; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);">
              <img src="https://cdn-icons-png.flaticon.com/512/732/732200.png" width="32" height="32" alt="Email icon" style="display: block; margin: 0 auto; filter: grayscale(100%); opacity: 0.8;" />
          </td>
      </tr>
  </table>
  <h1 style="color: #111827; font-size: 24px; margin-bottom: 5px;">Verify your email</h1>
  <p style="color: #6B7280; font-size: 16px; margin-top: 20px; text-align: left; line-height: 1.5;">
      Hello,<br><br>Welcome to <strong>xlinkly</strong>. To ensure the security of your account and activate all features, please verify your email address.
  </p>
  <div style="margin: 30px 0;">
      <p style="color: #4B5563; font-size: 14px; font-weight: 500; text-align: left; margin-bottom: 10px;">Copy this security code to the verification page:</p>
      <div style="background: #f3f4f6; padding: 25px; border-radius: 8px; border: 2px solid #000000; font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #000000;">{{code}}</div>
  </div>
  <p style="color: #6B7280; font-size: 14px; margin-bottom: 40px; text-align: left; line-height: 1.5;">
      This secure code will expire in 60 minutes.<br>If you did not request this, you can safely ignore this email.
  </p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
  <p style="color: #9CA3AF; font-size: 12px; line-height: 1.5;">© 2024 xlinkly. Secure Infrastructure.<br>Tech District, Global Terminal.</p>
</div>`;
            resetTemplateText.value = `<div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 40px auto; background: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; border: 1px solid #e5e7eb;">
  <div style="font-size: 28px; font-weight: 800; color: #09090b; letter-spacing: -1px; text-align: center; margin-bottom: 30px;">
      {% if logo %}<img src="{{logo}}" width="24" height="24" alt="xlinkly logo" style="vertical-align: middle; margin-right: 6px; margin-bottom: 4px;" />{% else %}<img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2309090b' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71'/%3E%3Cpath d='M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'/%3E%3C/svg%3E" width="24" height="24" alt="xlinkly logo" style="vertical-align: middle; margin-right: 6px; margin-bottom: 4px;" />{% endif %}
      <span style="vertical-align: middle;">xlinkly</span>
  </div>
  <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto 24px;">
      <tr>
          <td align="center" valign="middle" width="72" height="72" style="background: #fafafa; border-radius: 20px; border: 1px solid #e4e4e7; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);">
              <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24' fill='none' stroke='%2309090b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='11' width='18' height='11' rx='2' ry='2'/%3E%3Cpath d='M7 11V7a5 5 0 0 1 10 0v4'/%3E%3Ccircle cx='12' cy='16' r='1'/%3E%3C/svg%3E" width="32" height="32" alt="Password icon" style="display: block; margin: 0 auto;" />
          </td>
      </tr>
  </table>
  <h1 style="color: #111827; font-size: 24px; margin-bottom: 5px;">Password Reset</h1>
  <p style="color: #6B7280; font-size: 16px; margin-top: 20px; text-align: left; line-height: 1.5;">
      Hello,<br><br>We received a request to reset the password for your <strong>xlinkly</strong> account. If this was you, please use the secure code below to set a new password.
  </p>
  <div style="margin: 30px 0;">
      <p style="color: #4B5563; font-size: 14px; font-weight: 500; text-align: left; margin-bottom: 10px;">Copy this security code to the password reset page:</p>
      <div style="background: #f3f4f6; padding: 25px; border-radius: 8px; border: 2px solid #000000; font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #000000;">{{code}}</div>
  </div>
  <p style="color: #6B7280; font-size: 14px; margin-bottom: 40px; text-align: left; line-height: 1.5;">
      This secure code will expire in 60 minutes.<br>If you did not request this change, your account is still safe and you can ignore this email.
  </p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
  <p style="color: #9CA3AF; font-size: 12px; line-height: 1.5;">© 2024 xlinkly. Secure Infrastructure.<br>Tech District, Global Terminal.</p>
</div>`;
        }
    });

    document.getElementById('btnSaveTemplates').addEventListener('click', async () => {
        const domain = templateDomainSelect.value;
        if (!domain) return;

        try {
            const templatePayload = {
                verification_template: verifyTemplateText.value,
                reset_template: resetTemplateText.value
            };

            // Cache locally so we can restore if serverless DB gets wiped
            localStorage.setItem('mailbridge_templates_' + domain, JSON.stringify(templatePayload));

            const res = await fetch(`${API_URL}/email-settings/${domain}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(templatePayload)
            });

            if (!res.ok) throw new Error('Failed to update templates');
            showToast('Templates updated successfully!', 'success');
            loadDomains(); // refresh template cache
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    // Integration Logic
    const integrationDomainSelect = document.getElementById('integrationDomainSelect');
    const integrationLangSelect = document.getElementById('integrationLangSelect');
    const integrationActionSelect = document.getElementById('integrationActionSelect');
    const integrationCodeBlock = document.getElementById('integrationCodeBlock');
    const btnCopyCode = document.getElementById('btnCopyCode');

    [integrationDomainSelect, integrationLangSelect, integrationActionSelect].forEach(el => {
        if (el) el.addEventListener('change', updateIntegrationCode);
    });

    function updateIntegrationCode() {
        if (!integrationDomainSelect || !integrationCodeBlock) return;

        const domain = integrationDomainSelect.value;
        const lang = integrationLangSelect.value;
        const action = integrationActionSelect.value;

        if (!domain) {
            integrationCodeBlock.textContent = '// Please connect a domain first';
            return;
        }

        let endpoint = '';
        let payload = '';

        if (action === 'send-verification') {
            endpoint = '/send-verification';
            payload = `{\n  "domain": "${domain}",\n  "email": "user@example.com",\n  "user_id": "123"\n}`;
        } else if (action === 'send-reset') {
            endpoint = '/send-reset';
            payload = `{\n  "domain": "${domain}",\n  "email": "user@example.com"\n}`;
        } else if (action === 'verify-token') {
            endpoint = '/verify-token?email=user@example.com&token=RAW_TOKEN_OR_OTP&type=verify';
            payload = null;
        } else if (action === 'verify-code') {
            endpoint = '/verify-code';
            payload = `{\n  "email": "user@example.com",\n  "code": "123456",\n  "type": "verify"\n}`;
        }

        const url = `${API_URL}${endpoint}`;
        let code = '';

        if (lang === 'javascript') {
            code = `// JavaScript (Fetch) Example\n`;
            if (payload) {
                code += `fetch('${url}', {\n  method: 'POST',\n  headers: {\n    'Content-Type': 'application/json'\n  },\n  body: JSON.stringify(${payload})\n})\n.then(res => res.json())\n.then(data => console.log(data))\n.catch(err => console.error(err));`;
            } else {
                code += `fetch('${url}')\n.then(res => res.json())\n.then(data => console.log(data))\n.catch(err => console.error(err));`;
            }
        } else if (lang === 'react') {
            code = `// React Component Example\nimport React, { useState } from 'react';\n\nexport default function EmailAuth() {\n  const handleAction = async () => {\n`;
            if (payload) {
                code += `    try {\n      const res = await fetch('${url}', {\n        method: 'POST',\n        headers: {\n          'Content-Type': 'application/json'\n        },\n        body: JSON.stringify(${payload.replace(/\n/g, '\n        ')})\n      });\n      const data = await res.json();\n      console.log(data);\n    } catch (err) {\n      console.error(err);\n    }\n`;
            } else {
                code += `    try {\n      const res = await fetch('${url}');\n      const data = await res.json();\n      console.log(data);\n    } catch (err) {\n      console.error(err);\n    }\n`;
            }
            code += `  };\n\n  return (\n    <button onClick={handleAction}>Trigger Action</button>\n  );\n}`;
        } else if (lang === 'php') {
            code = `<?php\n// PHP cURL Example\n$ch = curl_init();\n\ncurl_setopt($ch, CURLOPT_URL, '${url}');\ncurl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);\n`;
            if (payload) {
                code += `curl_setopt($ch, CURLOPT_POST, 1);\ncurl_setopt($ch, CURLOPT_POSTFIELDS, '${payload.replace(/\n/g, ' ')}');\n`;
                code += `$headers = array('Content-Type: application/json');\ncurl_setopt($ch, CURLOPT_HTTPHEADER, $headers);\n`;
            }
            code += `\n$result = curl_exec($ch);\nif (curl_errno($ch)) {\n    echo 'Error:' . curl_error($ch);\n}\ncurl_close($ch);\nvar_dump(json_decode($result, true));\n?>`;
        } else if (lang === 'python') {
            code = `# Python Requests Example\nimport requests\n\nurl = '${url}'\n`;
            if (payload) {
                code += `payload = ${payload.replace(/\n/g, '\n')}\nresponse = requests.post(url, json=payload)\n`;
            } else {
                code += `response = requests.get(url)\n`;
            }
            code += `print(response.json())`;
        } else if (lang === 'curl') {
            code = `# cURL Example\n`;
            if (payload) {
                code += `curl -X POST '${url}' \\\n-H 'Content-Type: application/json' \\\n-d '${payload.replace(/\n/g, '')}'`;
            } else {
                code += `curl -X GET '${url}'`;
            }
        }

        integrationCodeBlock.textContent = code;
    }

    if (btnCopyCode) {
        btnCopyCode.addEventListener('click', () => {
            navigator.clipboard.writeText(integrationCodeBlock.textContent);
            const ogText = btnCopyCode.innerText;
            btnCopyCode.innerText = 'Copied!';
            setTimeout(() => btnCopyCode.innerText = ogText, 2000);
        });
    }

    // Initialize list empty
    switchSection(navSetup, setupSection);
});
