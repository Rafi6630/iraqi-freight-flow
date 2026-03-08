// Mock data for ERP frontend development

export const mockCustomers = [
  { id: '1', company: 'Al-Rasheed Trading Co.', contact_name: 'Ahmed Al-Rasheed', phone: '+964 770 123 4567', email: 'ahmed@rasheed.iq', city: 'Baghdad', status: 'active', credit_limit_usd: 50000, payment_terms_days: 30 },
  { id: '2', company: 'Kurdistan Import/Export', contact_name: 'Dara Hassan', phone: '+964 750 234 5678', email: 'dara@kie.iq', city: 'Erbil', status: 'active', credit_limit_usd: 75000, payment_terms_days: 45 },
  { id: '3', company: 'Basra Logistics LLC', contact_name: 'Mustafa Ali', phone: '+964 780 345 6789', email: 'mustafa@basralog.iq', city: 'Basra', status: 'active', credit_limit_usd: 30000, payment_terms_days: 15 },
  { id: '4', company: 'Mesopotamia Supplies', contact_name: 'Sara Ibrahim', phone: '+964 770 456 7890', email: 'sara@mesosupply.iq', city: 'Sulaymaniyah', status: 'inactive', credit_limit_usd: 25000, payment_terms_days: 30 },
  { id: '5', company: 'Tigris Commerce Group', contact_name: 'Omar Khalid', phone: '+964 750 567 8901', email: 'omar@tigris.iq', city: 'Mosul', status: 'active', credit_limit_usd: 100000, payment_terms_days: 60 },
];

export const mockVendors = [
  { id: '1', company: 'Gulf Shipping Lines', type: 'Sea Carrier', phone: '+971 4 123 4567', email: 'ops@gulfship.ae', city: 'Dubai', rating: 4.5 },
  { id: '2', company: 'Iraq Customs Agency', type: 'Customs Broker', phone: '+964 770 111 2222', email: 'info@iraqcustoms.iq', city: 'Baghdad', rating: 4.0 },
  { id: '3', company: 'Turkish Trucking Co.', type: 'Road Carrier', phone: '+90 312 555 6677', email: 'dispatch@turktrk.tr', city: 'Istanbul', rating: 3.8 },
  { id: '4', company: 'Basra Port Services', type: 'Port Agent', phone: '+964 780 333 4444', email: 'port@basraport.iq', city: 'Basra', rating: 4.2 },
  { id: '5', company: 'Emirates Cargo Air', type: 'Air Carrier', phone: '+971 2 777 8888', email: 'cargo@emiratesair.ae', city: 'Abu Dhabi', rating: 4.7 },
];

export const mockEmployees = [
  { id: '1', name: 'Hassan Al-Bayati', role: 'Operations Manager', commission_rate_pct: 2.5, status: 'active' },
  { id: '2', name: 'Noor Al-Saadi', role: 'Sales Executive', commission_rate_pct: 5.0, status: 'active' },
  { id: '3', name: 'Kareem Fadhil', role: 'Logistics Coordinator', commission_rate_pct: 1.5, status: 'active' },
  { id: '4', name: 'Zainab Mahmoud', role: 'Finance Officer', commission_rate_pct: 0, status: 'active' },
];

export const mockOrders = [
  { id: '1', order_no: 'ORD-2024-0001', customer: 'Al-Rasheed Trading Co.', mode: 'sea', direction: 'import', origin: 'Shanghai, CN', destination: 'Basra, IQ', status_step: 8, responsible: 'Hassan Al-Bayati', etd: '2024-03-15', eta: '2024-04-20', revenue_usd: 12500, costs_usd: 8750 },
  { id: '2', order_no: 'ORD-2024-0002', customer: 'Kurdistan Import/Export', mode: 'air', direction: 'import', origin: 'Istanbul, TR', destination: 'Erbil, IQ', status_step: 5, responsible: 'Noor Al-Saadi', etd: '2024-04-01', eta: '2024-04-03', revenue_usd: 4800, costs_usd: 3200 },
  { id: '3', order_no: 'ORD-2024-0003', customer: 'Basra Logistics LLC', mode: 'road', direction: 'export', origin: 'Baghdad, IQ', destination: 'Amman, JO', status_step: 3, responsible: 'Kareem Fadhil', etd: '2024-04-10', eta: '2024-04-14', revenue_usd: 2200, costs_usd: 1500 },
  { id: '4', order_no: 'ORD-2024-0004', customer: 'Tigris Commerce Group', mode: 'sea', direction: 'import', origin: 'Mumbai, IN', destination: 'Umm Qasr, IQ', status_step: 9, responsible: 'Hassan Al-Bayati', etd: '2024-02-01', eta: '2024-03-05', revenue_usd: 18000, costs_usd: 12600 },
  { id: '5', order_no: 'ORD-2024-0005', customer: 'Mesopotamia Supplies', mode: 'air', direction: 'import', origin: 'Dubai, AE', destination: 'Sulaymaniyah, IQ', status_step: 1, responsible: 'Noor Al-Saadi', etd: '', eta: '', revenue_usd: 0, costs_usd: 0 },
];

export const mockDashboardMetrics = {
  totalRevenue: { usd: 37500, iqd: 49125000 },
  outstandingAR: { usd: 15200, iqd: 19912000 },
  operationalProfit: { usd: 12950, iqd: 16964500 },
  financialExposure: { usd: 8300, iqd: 10873000 },
  fxGainLossMTD: { usd: 245, iqd: 320950 },
  activeOrders: 4,
  pendingQuotations: 2,
  overdueInvoices: 1,
};

export const mockExchangeRates = [
  { id: '1', currency_from: 'USD', currency_to: 'IQD', exchange_rate: 1310, effective_date: '2024-04-01', status: 'Active', updated_by: 'System' },
  { id: '2', currency_from: 'EUR', currency_to: 'USD', exchange_rate: 1.085, effective_date: '2024-04-01', status: 'Active', updated_by: 'System' },
  { id: '3', currency_from: 'GBP', currency_to: 'USD', exchange_rate: 1.265, effective_date: '2024-04-01', status: 'Active', updated_by: 'System' },
  { id: '4', currency_from: 'CNY', currency_to: 'USD', exchange_rate: 0.138, effective_date: '2024-04-01', status: 'Active', updated_by: 'System' },
  { id: '5', currency_from: 'USD', currency_to: 'IQD', exchange_rate: 1305, effective_date: '2024-03-01', status: 'Inactive', updated_by: 'System' },
];

export const mockExpenses = [
  { id: '1', exp_no: 'EXP-2024-001', category: 'Office Rent', description: 'Baghdad office rent - April', amount_usd: 2500, amount_iqd: 3275000, date: '2024-04-01', status: 'approved' },
  { id: '2', exp_no: 'EXP-2024-002', category: 'Fuel', description: 'Fleet fuel costs', amount_usd: 850, amount_iqd: 1113500, date: '2024-04-05', status: 'pending' },
  { id: '3', exp_no: 'EXP-2024-003', category: 'Utilities', description: 'Internet & phone', amount_usd: 320, amount_iqd: 419200, date: '2024-04-03', status: 'approved' },
];

export const mockPayments = [
  { id: '1', pay_no: 'PAY-2024-001', direction: 'AR', ref_type: 'invoice', counterparty: 'Al-Rasheed Trading Co.', amount_usd: 6250, amount_iqd: 8187500, fx_rate: 1310, method: 'Bank Transfer', date: '2024-04-05', fx_gain_loss_usd: 12.50 },
  { id: '2', pay_no: 'PAY-2024-002', direction: 'AP', ref_type: 'bill', counterparty: 'Gulf Shipping Lines', amount_usd: 4375, amount_iqd: 5731250, fx_rate: 1310, method: 'Wire Transfer', date: '2024-04-08', fx_gain_loss_usd: -8.30 },
  { id: '3', pay_no: 'PAY-2024-003', direction: 'AR', ref_type: 'invoice', counterparty: 'Tigris Commerce Group', amount_usd: 9000, amount_iqd: 11790000, fx_rate: 1310, method: 'Cash', date: '2024-04-10', fx_gain_loss_usd: 0 },
];
