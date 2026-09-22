/**
 * QR Code Service
 * Handles generating the QR code for mobile access
 */

const QRService = {
    qrcode: null,
    
    init() {
        const qrContainer = document.getElementById('qrcode');
        const urlDisplay = document.getElementById('qr-url-display');
        const copyBtn = document.getElementById('copy-url-btn');
        
        // Display the URL
        urlDisplay.textContent = CONFIG.DASHBOARD_URL;
        
        // Generate QR Code
        this.qrcode = new QRCode(qrContainer, {
            text: CONFIG.DASHBOARD_URL,
            width: 150,
            height: 150,
            colorDark : "#000000",
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.H
        });
        
        // Copy Button Logic
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(CONFIG.DASHBOARD_URL).then(() => {
                const originalText = copyBtn.innerHTML;
                copyBtn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
                copyBtn.style.backgroundColor = 'var(--accent-good)';
                copyBtn.style.color = '#fff';
                
                setTimeout(() => {
                    copyBtn.innerHTML = originalText;
                    copyBtn.style.backgroundColor = '';
                    copyBtn.style.color = '';
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
            });
        });
    }
};
