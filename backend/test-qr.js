const http = require('http');

const data = JSON.stringify({ email: 'admin@queueflow.com', password: 'Admin@123' });

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/v1/auth/staff/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    const token = JSON.parse(body).data.token;
    
    // Test invalid QR code
    const qrData = JSON.stringify({ qrData: '12345678-1234-1234-1234-1234567890xy', counterId: '1' });
    const qrReq = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/admin/scan-qr',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
        'Content-Length': qrData.length
      }
    }, (res2) => {
      let b = '';
      res2.on('data', d => b += d);
      res2.on('end', () => console.log('QR Scan res:', res2.statusCode, b));
    });
    qrReq.write(qrData);
    qrReq.end();
  });
});
req.write(data);
req.end();
