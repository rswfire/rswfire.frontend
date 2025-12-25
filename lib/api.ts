function getApiBase(): string {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    if (!apiUrl) {
        throw new Error("NEXT_PUBLIC_API_URL environment variable is not set");
    }

    return apiUrl;
}

interface LoginCredentials {
    email: string;
    password: string;
}

interface AuthResponse {
    token: string;
    user: {
        id: number;
        name: string;
        email: string;
    };
}

class ApiClient {
    private getToken(): string | null {
        if (typeof window === "undefined") return null;
        return localStorage.getItem("auth_token");
    }

    private async request(endpoint: string, options: RequestInit = {}) {
        const token = this.getToken();

        const headers: Record<string, string> = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        };

        if (options.headers) {
            Object.assign(headers, options.headers);
        }

        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        const url = `${getApiBase()}${endpoint}`;

        const response = await fetch(url, {
            ...options,
            headers,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: "Request failed" }));
            throw new Error(error.message || "Request failed");
        }

        return response.json();
    }

    async login(credentials: LoginCredentials): Promise<AuthResponse> {
        return this.request("/login", {
            method: "POST",
            body: JSON.stringify(credentials),
        });
    }

    async logout(): Promise<void> {
        return this.request("/logout", { method: "POST" });
    }

    async fetchUser() {
        return this.request("/user");
    }

    async getStagingPhotos() {
        return this.request("/admin/photos/staging");
    }

    async batchProcessPhotos(decisions: Array<{ulid: string, action: string, context?: string}>) {
        return this.request("/admin/photos/staging/batch", {
            method: "POST",
            body: JSON.stringify({ decisions }),
        });
    }

}

export const api = new ApiClient();
export { getApiBase };
