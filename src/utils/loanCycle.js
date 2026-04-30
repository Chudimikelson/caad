const safeTime = (value) => {
  const time = new Date(value || "").getTime();
  return Number.isFinite(time) ? time : Number.MAX_SAFE_INTEGER;
};

const loanIdentity = (loan) => String(loan?.id || loan?._id || "");

export const buildLoanCycleMap = (loans = []) => {
  const grouped = new Map();

  loans.forEach((loan) => {
    const customerKey = String(loan?.customerName || "").trim().toLowerCase();
    if (!customerKey) return;
    if (!grouped.has(customerKey)) grouped.set(customerKey, []);
    grouped.get(customerKey).push(loan);
  });

  const cycleMap = new Map();

  grouped.forEach((customerLoans) => {
    const sorted = [...customerLoans].sort((a, b) => {
      const byStartDate = safeTime(a?.startDate) - safeTime(b?.startDate);
      if (byStartDate !== 0) return byStartDate;

      const byCreatedAt = safeTime(a?.createdAt) - safeTime(b?.createdAt);
      if (byCreatedAt !== 0) return byCreatedAt;

      return loanIdentity(a).localeCompare(loanIdentity(b));
    });

    sorted.forEach((loan, index) => {
      const key = loanIdentity(loan);
      if (!key) return;
      cycleMap.set(key, index + 1);
    });
  });

  return cycleMap;
};

export const getLoanCycle = (cycleMap, loan) => {
  const key = loanIdentity(loan);
  if (!key) return 1;
  return cycleMap.get(key) || 1;
};
