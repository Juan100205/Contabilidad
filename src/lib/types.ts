export type Currency = {
  code: string;
  name: string;
  symbol: string;
};

export type RolUsuario = "Administrador" | "Visualizador";
export type TemaUsuario = "Oscuro" | "RosaPastel";

export type LoginResponse = {
  token: string;
  userId: string;
  username: string;
  displayName: string;
  role: RolUsuario;
  theme: TemaUsuario;
};

export type PeriodSettings = {
  periodStartDay: number;
};

export type EstadoDeseo = "Activo" | "Comprado" | "Cancelado";

export type WishlistItem = {
  id: string;
  name: string;
  description: string | null;
  targetPrice: number;
  currencyCode: string;
  targetDate: string | null;
  status: EstadoDeseo;
  savedSoFar: number;
  remainingAmount: number;
  monthsRemaining: number | null;
  suggestedMonthlySavings: number | null;
};

export type ChatHistoryItem = {
  role: "user" | "assistant";
  content: string;
};

export type JarvisAction = {
  type: string;
  label: string;
  endpoint: string;
  method: string;
  payload: Record<string, unknown>;
};

export type JarvisChatResponse = {
  reply: string;
  action: JarvisAction | null;
};

export type ExchangeRate = {
  id: string;
  fromCurrencyCode: string;
  toCurrencyCode: string;
  rate: number;
  updatedAtUtc: string;
};

export type EstadoIngreso = "Proyectado" | "Recibido";

export type IncomeEntry = {
  id: string;
  description: string;
  source: string;
  amount: number;
  currencyCode: string;
  date: string;
  isRecurring: boolean;
  administerUntil: string | null;
  storageLocation: string | null;
  status: EstadoIngreso;
};

export type CategoriaGasto =
  | "Vivienda"
  | "Transporte"
  | "Alimentacion"
  | "Salud"
  | "Educacion"
  | "Entretenimiento"
  | "Servicios"
  | "Otro";

export type EstadoGasto = "Pendiente" | "Pagado";

export type Expense = {
  id: string;
  description: string;
  category: CategoriaGasto;
  amount: number;
  currencyCode: string;
  date: string;
  isRecurring: boolean;
  percentage: number | null;
  incomeSourceFilter: string | null;
  status: EstadoGasto;
  storageLocation: string | null;
};

export type TipoInteres = "Fijo" | "CompuestoMensual";
export type EstadoDeuda = "Activa" | "Pagada" | "EnMora";
export type FuenteDescuentoPago = "Ninguna" | "TotalIngresos" | "IngresoEspecifico" | "SaldoDisponible";

export type Debt = {
  id: string;
  name: string;
  creditor: string;
  principalAmount: number;
  currentBalance: number;
  currencyCode: string;
  annualInterestRate: number;
  interestType: TipoInteres;
  minimumMonthlyPayment: number;
  startDate: string;
  dueDate: string | null;
  status: EstadoDeuda;
  progressPercentage: number;
  totalPaid: number;
};

export type DebtPayment = {
  id: string;
  debtId: string;
  amount: number;
  interestPortion: number;
  principalPortion: number;
  date: string;
  note: string | null;
  incomeDeductionSource: FuenteDescuentoPago;
  incomeSourceFilter: string | null;
  status: EstadoGasto;
  canEdit: boolean;
  storageLocation: string | null;
};

export type EstadoMetaAhorro = "Activa" | "Cumplida" | "Pausada";
export type TipoMovimientoAhorro = "Deposito" | "Retiro";

export type SavingsGoal = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  targetAmount: number;
  currentAmount: number;
  currencyCode: string;
  targetDate: string | null;
  status: EstadoMetaAhorro;
  progressPercentage: number;
  percentage: number | null;
  incomeSourceFilter: string | null;
  suggestedMonthlyContribution: number | null;
  storageLocation: string | null;
};

export type SavingsMovement = {
  id: string;
  savingsGoalId: string;
  amount: number;
  type: TipoMovimientoAhorro;
  date: string;
  note: string | null;
  incomeDeductionSource: FuenteDescuentoPago;
  incomeSourceFilter: string | null;
  percentage: number | null;
  withdrawnFrom: string | null;
  depositedTo: string | null;
};

export type WeeklyProjection = {
  weekStart: string;
  weekEnd: string;
  amount: number;
  currencyCode: string;
  alreadyLoaded: boolean;
};

export type WeeklyBudgetTemplate = {
  id: string;
  effectiveFrom: string;
  mondayAmount: number;
  tuesdayAmount: number;
  wednesdayAmount: number;
  thursdayAmount: number;
  fridayAmount: number;
  saturdayAmount: number;
  sundayAmount: number;
  currencyCode: string;
  savingsGoalId: string;
  savingsGoalName: string;
  walletBalance: number;
  walletTarget: number;
  storageLocation: string | null;
  withdrawnFrom: string | null;
};

export type IncomeBySourceItem = {
  source: string;
  amount: number;
};

export type LocationBalanceItem = {
  location: string;
  amount: number;
};

export type IncomeLineItem = {
  id: string;
  description: string;
  source: string;
  amount: number;
  currencyCode: string;
  date: string;
  storageLocation: string | null;
  status: EstadoIngreso;
};

export type ExpenseLineItem = {
  id: string;
  description: string;
  category: CategoriaGasto;
  amount: number;
  currencyCode: string;
  date: string;
  status: EstadoGasto;
  storageLocation: string | null;
};

export type DebtPaymentLineItem = {
  id: string;
  debtName: string;
  amount: number;
  currencyCode: string;
  date: string;
  status: EstadoGasto;
  storageLocation: string | null;
};

export type SavingsMovementLineItem = {
  id: string;
  goalName: string;
  type: TipoMovimientoAhorro;
  amount: number;
  currencyCode: string;
  date: string;
};

export type BalanceSummary = {
  year: number;
  month: number;
  currencyCode: string;
  totalIncome: number;
  totalIncomeRecibido: number;
  totalIncomeProyectado: number;
  totalExpenses: number;
  totalExpensesPagados: number;
  totalExpensesPendientes: number;
  totalDebtPayments: number;
  totalDebtPaymentsPagados: number;
  totalDebtPaymentsPendientes: number;
  totalSavingsNet: number;
  totalCommitted: number;
  saldo: number;
  available: number;
  incomeBySource: IncomeBySourceItem[];
  savingsByLocation: LocationBalanceItem[];
  cashByLocation: LocationBalanceItem[];
  incomes: IncomeLineItem[];
  expenses: ExpenseLineItem[];
  debtPayments: DebtPaymentLineItem[];
  savingsMovements: SavingsMovementLineItem[];
};

export type ScheduledTemplate = {
  id: string;
  effectiveFrom: string;
  mondayAmount: number;
  tuesdayAmount: number;
  wednesdayAmount: number;
  thursdayAmount: number;
  fridayAmount: number;
  saturdayAmount: number;
  sundayAmount: number;
  currencyCode: string;
  withdrawnFrom: string | null;
};

export type FuenteGastoDiario = "Hoy" | "Acumulado" | "SaldoDisponible";

export type DailyExpenseEntry = {
  id: string;
  description: string;
  amount: number;
  date: string;
  source: FuenteGastoDiario;
};

export type CalendarDay = {
  date: string;
  plannedAmount: number;
  spentAmount: number;
  weekLoaded: boolean;
  weekLoadWarning: string | null;
  entries: DailyExpenseEntry[];
};

export type DailyDashboard = {
  date: string;
  plannedToday: number;
  spentToday: number;
  disponibleHoy: number;
  acumulado: number;
  walletBalance: number;
  walletTarget: number;
  walletPending: number;
  currencyCode: string;
  savingsGoalId: string;
  storageLocation: string | null;
  saldoDisponible: number;
  entries: DailyExpenseEntry[];
};

export type CurrencyAmount = {
  currencyCode: string;
  amount: number;
};

export type CategoryAmount = {
  category: CategoriaGasto;
  amountBase: number;
};

export type MonthlyPoint = {
  year: number;
  month: number;
  totalIncome: number;
  totalExpenses: number;
  netSavingsBase: number;
};

export type DashboardSummary = {
  year: number;
  month: number;
  baseCurrencyCode: string;
  incomeByCurrency: CurrencyAmount[];
  expensesByCurrency: CurrencyAmount[];
  debtBalanceByCurrency: CurrencyAmount[];
  savingsByCurrency: CurrencyAmount[];
  expensesByCategory: CategoryAmount[];
  totalIncomeBase: number;
  totalExpensesBase: number;
  totalDebtBase: number;
  totalSavingsBase: number;
  netWorthBase: number;
  lastSixMonths: MonthlyPoint[];
  activeDebts: Debt[];
  savingsGoals: SavingsGoal[];
};
