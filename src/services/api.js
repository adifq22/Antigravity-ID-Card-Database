const API_URL = 'http://localhost:5000/api';

// Helper to handle response
const handleResponse = async (response) => {
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'API Error');
    }
    return response.json();
};

export const api = {
    // EMPLOYEES
    getEmployees: async () => {
        try {
            const res = await fetch(`${API_URL}/employees`);
            return handleResponse(res);
        } catch (error) {
            console.warn("API Offline, using localStorage fallback if available");
            return null; // Return null to trigger fallback
        }
    },

    getEmployee: async (id) => {
        const res = await fetch(`${API_URL}/employees/${id}`);
        return handleResponse(res);
    },

    createEmployee: async (data) => {
        const res = await fetch(`${API_URL}/employees`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return handleResponse(res);
    },

    updateEmployee: async (id, data) => {
        const res = await fetch(`${API_URL}/employees/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return handleResponse(res);
    },

    deleteEmployee: async (id) => {
        const res = await fetch(`${API_URL}/employees/${id}`, {
            method: 'DELETE'
        });
        if (!res.ok) throw new Error('Failed to delete');
        return true;
    },

    // ATTENDANCE / SCAN
    scanCard: async (keycardId) => {
        const res = await fetch(`${API_URL}/attendance/scan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keycardId })
        });
        return handleResponse(res);
    },

    getHistory: async (employeeId) => {
        const res = await fetch(`${API_URL}/attendance/history/${employeeId}`);
        return handleResponse(res);
    }
};
