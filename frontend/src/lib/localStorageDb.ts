// LocalStorage Database Client to run Payment-Track fully offline without remote DB

const STORAGE_PREFIX = "payment_track_";

const DEFAULT_USER = {
  id: "local-admin-id",
  email: "admin@paymenttrack.local",
  user_metadata: { full_name: "Local Admin" },
  created_at: new Date().toISOString(),
};

const DEFAULT_SESSION = {
  access_token: "local-access-token-12345",
  user: DEFAULT_USER,
};

const INITIAL_PORTALS = [
  { id: "portal-1", name: "Amazon Pay", default_commission_rate: 2.5, default_site_fee: 0, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "portal-2", name: "Flipkart", default_commission_rate: 3.0, default_site_fee: 0, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "portal-3", name: "HDFC SmartBuy", default_commission_rate: 5.0, default_site_fee: 0, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "portal-4", name: "Axis GrabDeals", default_commission_rate: 4.0, default_site_fee: 0, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
];

const INITIAL_CARD_TYPES = [
  { id: 1, name: "HDFC Infinia", percentage: 3.3, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 2, name: "ICICI Amazon Pay", percentage: 5.0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 3, name: "Axis Magnus", percentage: 4.8, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 4, name: "SBI Cashback", percentage: 5.0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
];

const INITIAL_PORTAL_RATES = [
  { id: "rate-1", portal_id: "portal-1", card_type: "ICICI Amazon Pay", rate_percent: 5.0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "rate-2", portal_id: "portal-3", card_type: "HDFC Infinia", rate_percent: 10.0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
];

const INITIAL_PROFILES = [
  { id: "local-admin-id", email: "admin@paymenttrack.local", full_name: "Local Admin", business_name: "My Local Store", created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
];

const INITIAL_USER_ROLES = [
  { id: "role-1", user_id: "local-admin-id", role: "admin", created_at: new Date().toISOString() }
];

const INITIAL_TRANSACTIONS = [
  {
    id: "tx-1",
    user_id: "local-admin-id",
    portal_id: "portal-1",
    transaction_type: "Purchase",
    amount: 15000,
    commission: 375,
    site_fee: 0,
    profit: 375,
    transaction_date: new Date(Date.now() - 86400000 * 2).toISOString(),
    reference_number: "REF10001",
    status: "Completed",
    card_type: "ICICI Amazon Pay",
    notes: "Electronics purchase",
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: "tx-2",
    user_id: "local-admin-id",
    portal_id: "portal-3",
    transaction_type: "Gift Voucher",
    amount: 25000,
    commission: 1250,
    site_fee: 0,
    profit: 1250,
    transaction_date: new Date(Date.now() - 86400000 * 5).toISOString(),
    reference_number: "REF10002",
    status: "Completed",
    card_type: "HDFC Infinia",
    notes: "Voucher purchase",
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 5).toISOString()
  }
];

function getStorage<T>(key: string, defaultVal: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(defaultVal));
      return defaultVal;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading ${key} from localStorage:`, err);
    return defaultVal;
  }
}

function setStorage<T>(key: string, val: T): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(val));
  } catch (err) {
    console.error(`Error writing ${key} to localStorage:`, err);
  }
}

// Seed initial values if not present
function initializeData() {
  getStorage("portals", INITIAL_PORTALS);
  getStorage("card_types", INITIAL_CARD_TYPES);
  getStorage("portal_rates", INITIAL_PORTAL_RATES);
  getStorage("profiles", INITIAL_PROFILES);
  getStorage("user_roles", INITIAL_USER_ROLES);
  const txs = getStorage<any[]>("transactions", INITIAL_TRANSACTIONS);
  const now = new Date().toISOString();
  const healedTxs = txs.map((tx) => ({
    ...tx,
    transaction_date:
      tx.transaction_date && !isNaN(new Date(tx.transaction_date).getTime())
        ? tx.transaction_date
        : tx.created_at || now,
  }));
  setStorage("transactions", healedTxs);
  getStorage("transaction_templates", []);
  getStorage("scraping_configs", []);
  getStorage("session", DEFAULT_SESSION);
}

initializeData();

type FilterOp = 
  | { type: "eq"; field: string; value: any }
  | { type: "neq"; field: string; value: any }
  | { type: "in"; field: string; values: any[] }
  | { type: "gte"; field: string; value: any }
  | { type: "lte"; field: string; value: any };

type SortOp = { field: string; ascending: boolean };

class LocalQueryBuilder {
  private tableName: string;
  private filters: FilterOp[] = [];
  private sortOp: SortOp | null = null;
  private rangeStart: number | null = null;
  private rangeEnd: number | null = null;
  private selectColumns: string = "*";
  private isSingle: boolean = false;
  private isHead: boolean = false;
  private returnCount: boolean = false;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(columns: string = "*", options?: { count?: string; head?: boolean }) {
    this.selectColumns = columns;
    if (options?.head) this.isHead = true;
    if (options?.count) this.returnCount = true;
    return this;
  }

  eq(field: string, value: any) {
    if (value !== undefined && value !== null) {
      this.filters.push({ type: "eq", field, value });
    }
    return this;
  }

  neq(field: string, value: any) {
    if (value !== undefined && value !== null) {
      this.filters.push({ type: "neq", field, value });
    }
    return this;
  }

  in(field: string, values: any[]) {
    if (Array.isArray(values)) {
      this.filters.push({ type: "in", field, values });
    }
    return this;
  }

  gte(field: string, value: any) {
    if (value !== undefined && value !== null) {
      this.filters.push({ type: "gte", field, value });
    }
    return this;
  }

  lte(field: string, value: any) {
    if (value !== undefined && value !== null) {
      this.filters.push({ type: "lte", field, value });
    }
    return this;
  }

  order(field: string, options?: { ascending?: boolean }) {
    this.sortOp = { field, ascending: options?.ascending ?? true };
    return this;
  }

  range(from: number, to: number) {
    this.rangeStart = from;
    this.rangeEnd = to;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isSingle = true;
    return this;
  }

  private loadTable(): any[] {
    const table = getStorage<any[]>(this.tableName, []);
    if (this.tableName === "user_roles" && table.length === 0) {
      return [{ id: "role-1", user_id: "local-admin-id", role: "admin", created_at: new Date().toISOString() }];
    }
    return table;
  }

  private saveTable(rows: any[]): void {
    setStorage(this.tableName, rows);
  }

  private filterRows(rows: any[]): any[] {
    let filtered = rows.filter((row) => {
      for (const filter of this.filters) {
        const rowVal = row[filter.field];
        if (filter.type === "eq") {
          if (rowVal !== filter.value) return false;
        } else if (filter.type === "neq") {
          if (rowVal === filter.value) return false;
        } else if (filter.type === "in") {
          if (!filter.values.includes(rowVal)) return false;
        } else if (filter.type === "gte") {
          if (new Date(rowVal).getTime() < new Date(filter.value).getTime() && rowVal < filter.value) return false;
        } else if (filter.type === "lte") {
          if (new Date(rowVal).getTime() > new Date(filter.value).getTime() && rowVal > filter.value) return false;
        }
      }
      return true;
    });

    if (this.tableName === "user_roles" && filtered.length === 0) {
      const userFilter = this.filters.find(
        (f): f is { type: "eq"; field: string; value: any } => f.field === "user_id" && f.type === "eq"
      );
      const roleFilter = this.filters.find(
        (f): f is { type: "eq"; field: string; value: any } => f.field === "role" && f.type === "eq"
      );
      if (roleFilter?.value === "admin") {
        const userId = userFilter ? userFilter.value : "local-admin-id";
        filtered = [{ id: `role-${userId}`, user_id: userId, role: "admin", created_at: new Date().toISOString() }];
      }
    }

    return filtered;
  }

  private processJoins(rows: any[]): any[] {
    const hasPortalJoin = this.selectColumns.includes("portals");
    const hasProfileJoin = this.selectColumns.includes("profiles");

    if (!hasPortalJoin && !hasProfileJoin) return rows;

    const portals = hasPortalJoin ? getStorage<any[]>("portals", []) : [];
    const profiles = hasProfileJoin ? getStorage<any[]>("profiles", []) : [];

    return rows.map((row) => {
      const cloned = { ...row };
      if (hasPortalJoin && row.portal_id) {
        const portal = portals.find((p) => p.id === row.portal_id);
        cloned.portals = portal ? { id: portal.id, name: portal.name, default_commission_rate: portal.default_commission_rate } : null;
      }
      if (hasProfileJoin && row.user_id) {
        const profile = profiles.find((p) => p.id === row.user_id);
        cloned.profiles = profile ? { full_name: profile.full_name, email: profile.email } : null;
      }
      return cloned;
    });
  }

  async insert(data: any | any[]) {
    const items = Array.isArray(data) ? data : [data];
    const table = this.loadTable();
    const now = new Date().toISOString();

    const createdItems = items.map((item, index) => ({
      id: item.id || (this.tableName === "card_types" ? Date.now() + index : `loc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`),
      created_at: item.created_at || now,
      updated_at: now,
      transaction_date: item.transaction_date || item.created_at || now,
      ...item,
    }));

    table.push(...createdItems);
    this.saveTable(table);

    return { data: Array.isArray(data) ? createdItems : createdItems[0], error: null };
  }

  async update(data: any) {
    const table = this.loadTable();
    const now = new Date().toISOString();
    let updatedCount = 0;

    const updatedTable = table.map((row) => {
      let matches = true;
      for (const filter of this.filters) {
        if (filter.type === "eq" && row[filter.field] !== filter.value) {
          matches = false;
          break;
        }
      }
      if (matches) {
        updatedCount++;
        return { ...row, ...data, updated_at: now };
      }
      return row;
    });

    this.saveTable(updatedTable);
    return { data: updatedTable, error: null, count: updatedCount };
  }

  async upsert(data: any | any[], options?: { onConflict?: string }) {
    const items = Array.isArray(data) ? data : [data];
    const table = this.loadTable();
    const now = new Date().toISOString();
    const conflictKey = options?.onConflict || "id";

    items.forEach((item) => {
      const idx = table.findIndex((r) => r[conflictKey] === item[conflictKey]);
      if (idx >= 0) {
        table[idx] = { ...table[idx], ...item, updated_at: now };
      } else {
        table.push({
          id: item.id || `loc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          created_at: item.created_at || now,
          updated_at: now,
          ...item,
        });
      }
    });

    this.saveTable(table);
    return { data, error: null };
  }

  async delete() {
    const table = this.loadTable();
    const remaining = table.filter((row) => {
      for (const filter of this.filters) {
        if (filter.type === "eq" && row[filter.field] === filter.value) {
          return false; // delete this row
        }
      }
      return true;
    });

    this.saveTable(remaining);
    return { data: null, error: null };
  }

  then(resolve: (res: { data: any; error: any; count?: number }) => void, reject?: (reason: any) => void) {
    try {
      let rows = this.loadTable();
      rows = this.filterRows(rows);

      const totalCount = rows.length;

      if (this.sortOp) {
        const { field, ascending } = this.sortOp;
        rows.sort((a, b) => {
          const valA = a[field];
          const valB = b[field];
          if (valA < valB) return ascending ? -1 : 1;
          if (valA > valB) return ascending ? 1 : -1;
          return 0;
        });
      }

      if (this.rangeStart !== null && this.rangeEnd !== null) {
        rows = rows.slice(this.rangeStart, this.rangeEnd + 1);
      }

      rows = this.processJoins(rows);

      if (this.isHead) {
        resolve({ data: null, error: null, count: totalCount });
        return;
      }

      if (this.isSingle) {
        resolve({ data: rows[0] || null, error: null, count: rows.length ? 1 : 0 });
        return;
      }

      resolve({
        data: rows,
        error: null,
        count: this.returnCount ? totalCount : undefined,
      });
    } catch (err) {
      if (reject) reject(err);
      else resolve({ data: null, error: err });
    }
  }
}

class MockAuth {
  private authListeners: Array<(event: string, session: any) => void> = [];

  async getSession() {
    const session = getStorage("session", DEFAULT_SESSION);
    return { data: { session }, error: null };
  }

  async getUser() {
    const session = getStorage("session", DEFAULT_SESSION);
    return { data: { user: session?.user || null }, error: null };
  }

  onAuthStateChange(callback: (event: string, session: any) => void) {
    this.authListeners.push(callback);
    const session = getStorage("session", DEFAULT_SESSION);
    // Notify immediately
    setTimeout(() => callback("SIGNED_IN", session), 10);

    return {
      data: {
        subscription: {
          unsubscribe: () => {
            this.authListeners = this.authListeners.filter((cb) => cb !== callback);
          },
        },
      },
    };
  }

  async signInWithPassword(params: { email: string; password: string }) {
    const profiles = getStorage<any[]>("profiles", INITIAL_PROFILES);
    let profile = profiles.find((p) => p.email === params.email);

    if (!profile) {
      profile = {
        id: `user-${Date.now()}`,
        email: params.email,
        full_name: params.email.split("@")[0],
        business_name: "My Local Business",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      profiles.push(profile);
      setStorage("profiles", profiles);
    }

    const user = {
      id: profile.id,
      email: profile.email,
      user_metadata: { full_name: profile.full_name },
      created_at: profile.created_at,
    };

    const session = {
      access_token: `token-${Date.now()}`,
      user,
    };

    setStorage("session", session);
    this.notify("SIGNED_IN", session);

    return { data: { user, session }, error: null };
  }

  async signUp(params: { email: string; password: string; options?: { data?: { full_name?: string } } }) {
    const newUserId = `user-${Date.now()}`;
    const fullName = params.options?.data?.full_name || params.email.split("@")[0];

    const profiles = getStorage<any[]>("profiles", INITIAL_PROFILES);
    const newProfile = {
      id: newUserId,
      email: params.email,
      full_name: fullName,
      business_name: "My Business",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    profiles.push(newProfile);
    setStorage("profiles", profiles);

    const roles = getStorage<any[]>("user_roles", INITIAL_USER_ROLES);
    roles.push({
      id: `role-${Date.now()}`,
      user_id: newUserId,
      role: "user",
      created_at: new Date().toISOString(),
    });
    setStorage("user_roles", roles);

    const user = {
      id: newUserId,
      email: params.email,
      user_metadata: { full_name: fullName },
      created_at: newProfile.created_at,
    };

    const session = {
      access_token: `token-${Date.now()}`,
      user,
    };

    setStorage("session", session);
    this.notify("SIGNED_IN", session);

    return { data: { user, session }, error: null };
  }

  async signInWithOtp(_params: { email: string }) {
    return { data: {}, error: null };
  }

  async signOut() {
    setStorage("session", null);
    this.notify("SIGNED_OUT", null);
    return { error: null };
  }

  private notify(event: string, session: any) {
    this.authListeners.forEach((cb) => cb(event, session));
  }
}

class MockChannel {
  private name: string;
  constructor(name: string) {
    this.name = name;
  }
  on(_event: string, _config: any, _callback: () => void) {
    return this;
  }
  subscribe() {
    return this;
  }
}

class MockFunctions {
  async invoke(functionName: string, _options?: any) {
    console.log(`[LocalStorageDB] Mock function invoked: ${functionName}`);
    return {
      data: { message: `Simulated function call for ${functionName}` },
      error: null,
    };
  }
}

export const localSupabase = {
  auth: new MockAuth(),
  functions: new MockFunctions(),
  from(tableName: string) {
    return new LocalQueryBuilder(tableName);
  },
  channel(name: string) {
    return new MockChannel(name);
  },
  removeChannel(_channel: any) {
    return;
  },
};
