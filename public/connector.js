const API_BASE_URL = '/api';
const LANDING_ENDPOINT = `${API_BASE_URL}/landing`;
function showSuccessMessage(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 10000;
        font-family: Arial, sans-serif;
        max-width: 300px;
    `;
    successDiv.textContent = message;
    document.body.appendChild(successDiv);
    setTimeout(() => {
        if (successDiv.parentNode) {
            successDiv.parentNode.removeChild(successDiv);
        }
    }, 5000);
}
function showErrorMessage(message, errors = []) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #f44336;
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 10000;
        font-family: Arial, sans-serif;
        max-width: 300px;
    `;
    let errorText = message;
    if (errors && errors.length > 0) {
        errorText += '\n\n' + errors.map(err => `• ${err.msg}`).join('\n');
    }
    errorDiv.textContent = errorText;
    document.body.appendChild(errorDiv);
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    }, 7000);
}
function setFormLoading(form, isLoading) {
    const submitBtn = form.querySelector('button[type="submit"]');
    const preloader = form.querySelector('.preloader');
    if (isLoading) {
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting...';
        }
        if (preloader) {
            preloader.style.display = 'block';
        }
    } else {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Register';
        }
        if (preloader) {
            preloader.style.display = 'none';
        }
    }
}
function extractFormData(form) {
    const formData = new FormData(form);
    const data = {};
    data.firstName = formData.get('name') || '';
    data.lastName = formData.get('lastname') || '';
    data.email = formData.get('email') || '';
    data.phone = formData.get('phone') || '';
    const phoneInput = form.querySelector('input[name="phone"]');
    let countryCode = '';
    if (phoneInput) {
        const itiInstance = window.intlTelInputGlobals.getInstance(phoneInput);
        if (itiInstance) {
            const countryData = itiInstance.getSelectedCountryData();
            countryCode = countryData.dialCode || '';
        }
    }
    if (!countryCode) {
        const hiddenField = form.querySelector('input[name="params[phc]"]');
        if (hiddenField) {
            countryCode = hiddenField.value || '';
        }
    }
    if (!countryCode) {
        countryCode = '1';
    }
    data.prefix = countryCode.startsWith('+') ? countryCode : `+${countryCode}`;
    console.log('Extracted form data:', data);
    return data;
}
function validateFormData(data) {
    const errors = [];
    if (!data.firstName || data.firstName.trim().length < 2) {
        errors.push('First name must be at least 2 characters');
    }
    if (!data.lastName || data.lastName.trim().length < 2) {
        errors.push('Last name must be at least 2 characters');
    }
    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        errors.push('Please enter a valid email address');
    }
    if (!data.phone || data.phone.trim().length < 7) {
        errors.push('Please enter a valid phone number');
    }
    return errors;
}
async function submitFormData(data) {
    try {
        const response = await fetch(LANDING_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || 'Submission failed');
        }
        return result;
    } catch (error) {
        console.error('Form submission error:', error);
        throw error;
    }
}
async function onLeadSubmit(form, redirect = false) {
    try {
        console.log('Form submission started');
        setFormLoading(form, true);
        const formData = extractFormData(form);
        const validationErrors = validateFormData(formData);
        if (validationErrors.length > 0) {
            showErrorMessage('Please fix the following errors:', validationErrors.map(err => ({ msg: err })));
            setFormLoading(form, false);
            return false;
        }
        console.log('Submitting form data to backend...');
        const result = await submitFormData(formData);
        console.log('Form submission successful:', result);
        showSuccessMessage(result.message || 'Thank you! Your information has been submitted successfully.');
        form.reset();
        const popup = document.getElementById('popup_custom');
        if (popup && form.closest('#popup_custom')) {
            popup.style.visibility = 'hidden';
        }
        if (redirect && result.redirectUrl) {
            setTimeout(() => {
                window.location.href = result.redirectUrl;
            }, 2000);
        }
        console.log('✅ Form submission completed successfully');
        console.log('🚀 QuantumAI injection process has been started in the background');
        return true;
    } catch (error) {
        console.error('Form submission failed:', error);
        let errorMessage = 'Submission failed. Please try again.';
        let errors = [];
        if (error.message) {
            errorMessage = error.message;
        }
        if (error.response) {
            try {
                const errorData = await error.response.json();
                if (errorData.errors) {
                    errors = errorData.errors;
                }
                if (errorData.message) {
                    errorMessage = errorData.message;
                }
            } catch (parseError) {
                console.error('Error parsing error response:', parseError);
            }
        }
        showErrorMessage(errorMessage, errors);
        return false;
    } finally {
        setFormLoading(form, false);
    }
}
document.addEventListener('DOMContentLoaded', function() {
    console.log('QuantumAI Form Handler initialized');
    window.addEventListener('unhandledrejection', function(event) {
        console.error('Unhandled promise rejection:', event.reason);
    });
    const closeButton = document.querySelector('#popup_custom .close_button');
    if (closeButton) {
        closeButton.addEventListener('click', function() {
            const popup = document.getElementById('popup_custom');
            if (popup) {
                popup.style.visibility = 'hidden';
            }
        });
    }
    const popupOverlay = document.querySelector('#popup_custom .popup_overlay');
    if (popupOverlay) {
        popupOverlay.addEventListener('click', function() {
            const popup = document.getElementById('popup_custom');
            if (popup) {
                popup.style.visibility = 'hidden';
            }
        });
    }
});
window.onLeadSubmit = onLeadSubmit;
console.log('✅ QuantumAI connector.js loaded successfully');