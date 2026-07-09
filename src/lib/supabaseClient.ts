/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase environment variables are missing. Running in robust Demo / Sandbox mode.'
  );
}

// Helpers for mock authentication and local persistence
function getMockSession() {
  if (typeof window === "undefined") return null;
  const sessionData = localStorage.getItem("mock_supabase_session");
  if (!sessionData) return null;
  try {
    return JSON.parse(sessionData);
  } catch (e) {
    return null;
  }
}

function getMockProfile() {
  if (typeof window === "undefined") return null;
  const profile = localStorage.getItem("mock_profile");
  if (!profile) {
    // Default admin mock user so all dashboards are accessible in preview
    const defaultProfile = {
      id: "demo-user",
      email: "demo.taxwise@example.com",
      full_name: "Demo Professional",
      role: "Admin",
      plan: "premium",
      created_at: new Date().toISOString()
    };
    localStorage.setItem("mock_profile", JSON.stringify(defaultProfile));
    return defaultProfile;
  }
  try {
    return JSON.parse(profile);
  } catch (e) {
    return null;
  }
}

let authCallbacks: any[] = [];
function triggerCallbacks(event: string, session: any) {
  authCallbacks.forEach(cb => {
    try {
      cb(event, session);
    } catch (e) {
      console.error("Error in mock auth callback:", e);
    }
  });
}

// Mock query builder mimicking Supabase postgrest syntax
class MockQueryBuilder {
  private tableName: string;
  private filters: { col: string; val: any }[] = [];
  private limitCount: number | null = null;
  private singleResult: boolean = false;
  private actionType: "select" | "insert" | "update" | "delete" = "select";
  private actionData: any = null;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(fields?: string, options?: any) {
    this.actionType = "select";
    return this;
  }

  insert(data: any) {
    this.actionType = "insert";
    this.actionData = data;
    return this;
  }

  update(data: any) {
    this.actionType = "update";
    this.actionData = data;
    return this;
  }

  delete() {
    this.actionType = "delete";
    return this;
  }

  upsert(data: any, options?: any) {
    this.actionType = "insert";
    this.actionData = data;
    return this;
  }

  eq(col: string, val: any) {
    this.filters.push({ col, val });
    return this;
  }

  neq(col: string, val: any) { return this; }
  gt(col: string, val: any) { return this; }
  lt(col: string, val: any) { return this; }
  gte(col: string, val: any) { return this; }
  lte(col: string, val: any) { return this; }
  like(col: string, val: any) { return this; }
  ilike(col: string, val: any) { return this; }
  order(col: string, options?: any) { return this; }
  limit(n: number) {
    this.limitCount = n;
    return this;
  }

  single() {
    this.singleResult = true;
    return this;
  }

  // Promise-compatible then method
  then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any): Promise<any> {
    let resultPromise: Promise<any>;

    if (typeof window === "undefined") {
      resultPromise = Promise.resolve({ data: this.singleResult ? null : [], error: null });
    } else {
      const key = `mock_${this.tableName}`;

      if (this.tableName === "users") {
        const profile = getMockProfile();
        if (this.actionType === "update") {
          const updated = { ...profile, ...this.actionData };
          localStorage.setItem("mock_profile", JSON.stringify(updated));
          resultPromise = Promise.resolve({ data: updated, error: null });
        } else if (this.actionType === "delete") {
          localStorage.removeItem("mock_profile");
          localStorage.removeItem("mock_supabase_session");
          resultPromise = Promise.resolve({ data: null, error: null });
        } else {
          if (this.singleResult) {
            resultPromise = Promise.resolve({ data: profile, error: null });
          } else {
            resultPromise = Promise.resolve({ data: [profile], error: null });
          }
        }
      } else if (this.tableName === "site_settings") {
        if (this.actionType === "insert" || this.actionType === "update") {
          const data = JSON.parse(localStorage.getItem(key) || "[]");
          const inputRows = Array.isArray(this.actionData) ? this.actionData : [this.actionData];
          inputRows.forEach((row: any) => {
            const idx = data.findIndex((item: any) => item.key === row.key);
            if (idx > -1) {
              data[idx] = { ...data[idx], ...row };
            } else {
              data.push(row);
            }
          });
          localStorage.setItem(key, JSON.stringify(data));
          resultPromise = Promise.resolve({ data: inputRows, error: null });
        } else {
          resultPromise = Promise.resolve({ data: [], error: null });
        }
      } else {
        try {
          const data = JSON.parse(localStorage.getItem(key) || "[]");

          const matchesFilters = (item: any) => {
            return this.filters.every(f => {
              const itemVal = item[f.col];
              if (itemVal === undefined) return false;
              return String(itemVal) === String(f.val);
            });
          };

          if (this.actionType === "insert") {
            const itemsToInsert = Array.isArray(this.actionData)
              ? this.actionData.map((item: any) => ({ id: item.id || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)), created_at: new Date().toISOString(), ...item }))
              : [{ id: this.actionData.id || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)), created_at: new Date().toISOString(), ...this.actionData }];
            
            data.push(...itemsToInsert);
            localStorage.setItem(key, JSON.stringify(data));
            resultPromise = Promise.resolve({ data: itemsToInsert, error: null });

          } else if (this.actionType === "update") {
            const updatedItems: any[] = [];
            const updatedData = data.map((item: any) => {
              if (this.filters.length === 0 || matchesFilters(item)) {
                const updatedItem = { ...item, ...this.actionData };
                updatedItems.push(updatedItem);
                return updatedItem;
              }
              return item;
            });
            localStorage.setItem(key, JSON.stringify(updatedData));
            resultPromise = Promise.resolve({ data: updatedItems, error: null });

          } else if (this.actionType === "delete") {
            const deletedItems: any[] = [];
            const remainingData = data.filter((item: any) => {
              if (this.filters.length === 0 || matchesFilters(item)) {
                deletedItems.push(item);
                return false;
              }
              return true;
            });
            localStorage.setItem(key, JSON.stringify(remainingData));
            resultPromise = Promise.resolve({ data: deletedItems, error: null });

          } else {
            let filteredData = data;
            if (this.filters.length > 0) {
              filteredData = data.filter(matchesFilters);
            }
            if (this.limitCount !== null) {
              filteredData = filteredData.slice(0, this.limitCount);
            }
            if (this.singleResult) {
              resultPromise = Promise.resolve({ data: filteredData[0] || null, error: null });
            } else {
              resultPromise = Promise.resolve({ data: filteredData, error: null, count: filteredData.length });
            }
          }
        } catch (e) {
          resultPromise = Promise.resolve({ data: this.singleResult ? null : [], error: null });
        }
      }
    }

    return resultPromise.then(onfulfilled, onrejected);
  }
}

// Fully custom Mock Supabase Client
const mockSupabase = {
  auth: {
    getSession: () => {
      const session = getMockSession();
      return Promise.resolve({ data: { session }, error: null });
    },
    onAuthStateChange: (callback: any) => {
      authCallbacks.push(callback);
      const session = getMockSession();
      // Invoke callback on a macro-task tick to prevent dispatching during rendering
      setTimeout(() => {
        try {
          callback("INITIAL_SESSION", session);
        } catch (e) {}
      }, 0);

      return {
        data: {
          subscription: {
            unsubscribe: () => {
              authCallbacks = authCallbacks.filter(cb => cb !== callback);
            }
          }
        }
      };
    },
    signInWithPassword: ({ email }: any) => {
      const session = {
        access_token: "mock-token",
        token_type: "bearer",
        expires_in: 3600,
        refresh_token: "mock-refresh",
        user: {
          id: "demo-user",
          email: email,
          user_metadata: {
            full_name: email.split("@")[0].toUpperCase(),
            role: "Admin",
          },
          app_metadata: {},
          aud: "authenticated",
          created_at: new Date().toISOString(),
        }
      };
      if (typeof window !== "undefined") {
        localStorage.setItem("mock_supabase_session", JSON.stringify(session));
        localStorage.setItem("mock_profile", JSON.stringify({
          id: "demo-user",
          email: email,
          full_name: email.split("@")[0].toUpperCase(),
          role: "Admin",
          plan: "premium",
          created_at: new Date().toISOString()
        }));
      }
      triggerCallbacks("SIGNED_IN", session);
      return Promise.resolve({ data: { user: session.user, session }, error: null });
    },
    signUp: ({ email, options }: any) => {
      const session = {
        access_token: "mock-token",
        token_type: "bearer",
        expires_in: 3600,
        refresh_token: "mock-refresh",
        user: {
          id: "demo-user",
          email: email,
          user_metadata: {
            full_name: options?.data?.full_name || email.split("@")[0],
            role: options?.data?.role || "Student",
          },
          app_metadata: {},
          aud: "authenticated",
          created_at: new Date().toISOString(),
        }
      };
      if (typeof window !== "undefined") {
        localStorage.setItem("mock_supabase_session", JSON.stringify(session));
        localStorage.setItem("mock_profile", JSON.stringify({
          id: "demo-user",
          email: email,
          full_name: options?.data?.full_name || email.split("@")[0],
          role: options?.data?.role || "Student",
          plan: "free",
          created_at: new Date().toISOString()
        }));
      }
      triggerCallbacks("SIGNED_IN", session);
      return Promise.resolve({ data: { user: session.user, session }, error: null });
    },
    signOut: () => {
      if (typeof window !== "undefined") {
        localStorage.removeItem("mock_supabase_session");
        localStorage.removeItem("mock_profile");
      }
      triggerCallbacks("SIGNED_OUT", null);
      return Promise.resolve({ error: null });
    },
    resetPasswordForEmail: (email: string, options?: any) => {
      if (typeof window !== "undefined") {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let code = "";
        for (let i = 0; i < 8; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        localStorage.setItem("mock_otp_code", code);
        localStorage.setItem("mock_otp_email", email);
        console.log(`[Mock Auth] Reset code generated for ${email}: ${code}`);
        
        // Show a clear instructions alert with the code
        alert(`[DEBUG - Sandbox Mode]\n\nPassword reset code generated for: ${email}\n\nReset Code: ${code}\n\nThis code has been copied to your clipboard. Please paste it into the 8-Character Reset Code field to proceed.`);
        try {
          navigator.clipboard.writeText(code);
        } catch (e) {}
      }
      return Promise.resolve({ data: {}, error: null });
    },
    verifyOtp: (options: any) => {
      const email = options?.email;
      const token = options?.token;
      
      if (typeof window !== "undefined") {
        const savedCode = localStorage.getItem("mock_otp_code");
        const savedEmail = localStorage.getItem("mock_otp_email");
        
        if (savedCode && savedEmail && savedEmail.toLowerCase() === email?.toLowerCase()) {
          if (savedCode.trim().toUpperCase() !== token?.trim().toUpperCase()) {
            return Promise.resolve({
              data: { session: null },
              error: new Error("Invalid reset code. Please check and try again.")
            });
          }
        }
      }
      
      const session = {
        access_token: "mock-token",
        token_type: "bearer",
        expires_in: 3600,
        refresh_token: "mock-refresh",
        user: {
          id: "demo-user",
          email: email || "demo.taxwise@example.com",
          user_metadata: {
            full_name: (email || "demo.taxwise@example.com").split("@")[0].toUpperCase(),
            role: "Admin",
          },
          app_metadata: {},
          aud: "authenticated",
          created_at: new Date().toISOString(),
        }
      };
      if (typeof window !== "undefined") {
        localStorage.setItem("mock_supabase_session", JSON.stringify(session));
      }
      return Promise.resolve({ data: { session }, error: null });
    },
    updateUser: (options: any) => {
      const profile = getMockProfile();
      if (typeof window !== "undefined") {
        const updated = { ...profile, ...options.data };
        localStorage.setItem("mock_profile", JSON.stringify(updated));
      }
      return Promise.resolve({ data: { user: getMockSession()?.user }, error: null });
    }
  },
  from: (tableName: string) => {
    return new MockQueryBuilder(tableName);
  }
};

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (mockSupabase as unknown as ReturnType<typeof createClient>);
