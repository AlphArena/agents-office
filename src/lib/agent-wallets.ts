export const AGENT_WALLETS: Record<string, string> = {
  alex: "4QZew1pkJdprkJd1oU5dFXfUydWhGwHoEE7jqvrkiFqC",
  atlas: "8UB63BDRekhhTc1x5a3cjQTaoc3zrEpztRyVjcLoc556",
  luna: "8j3Km5jGgJu3NPnboGDfniTSqh8Y9Yjy4pHyyNeUC6ut",
  mia: "92bpVDMTxNPTEoqkwSudtszPaSv6KWugFwPKD7XM8CNc",
  rex: "5k4Cz96XXPNVQ4owvRenGLqoVjMkqiYwUvRjriigNpuV",
  sage: "C8aQK69iS5Xjijy2Fn8LXSD451ZwoMYoMFcJQBt5U5GY",
  sam: "CT5NgMd3Fr9gbW338DyvqozUG61AyRW9kRtpAUhSbWhY",
  victor: "148evh5h3F3kdNKTKcSrAqSCEKhRL4QZf3LnpiyQ4xaf",
  zara: "GLozxbvUgFmpKm6YyNGC6DCeKTxbWes8nLJhwZK7c4D9",
};

// Cost charged to user per agent call (atomic USDC)
export const USER_COST = 50; // $0.00005

// Amount paid to the agent per call (atomic USDC)
export const AGENT_PAY = 30; // $0.00003 — platform keeps $0.00002 margin
