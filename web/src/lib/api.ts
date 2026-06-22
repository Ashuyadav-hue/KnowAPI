const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export async function apiRequest(
  path: string,
  method = 'GET',
  body?: any,
  isMultipart = false
) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  const headers: Record<string, string> = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }

  const options: RequestInit = {
    method,
    headers,
  };

  if (body) {
    options.body = isMultipart ? body : JSON.stringify(body);
  }

  const response = await fetch(`${API_URL}${path}`, options);

  if (!response.ok) {
    const errText = await response.text();
    let errData;
    try {
      errData = JSON.parse(errText);
    } catch {
      errData = { message: errText };
    }
    throw new Error(errData.message || errData.error || 'Request failed');
  }

  return response.json();
}
