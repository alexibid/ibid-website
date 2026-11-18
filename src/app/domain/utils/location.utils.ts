export function locationToInt(location: string | number | undefined): number {
  if (location === undefined || location === null || location === '') return 0;
  
  const s = String(location).trim().toUpperCase();
  
  const romanMap: Record<string, number> = {
    'I': 1, 'V': 5, 'X': 10, 'L': 50, 'C': 100, 'D': 500, 'M': 1000
  };
  
  if (/^[IVXLCDM]+$/.test(s)) {
    let total = 0;
    let prevValue = 0;
    for (let i = s.length - 1; i >= 0; i--) {
      const currentValue = romanMap[s[i]];
      if (currentValue < prevValue) {
        total -= currentValue;
      } else {
        total += currentValue;
      }
      prevValue = currentValue;
    }
    return total;
  }
  
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  
  return 0;
}

export function intToRoman(num: number): string {
  if (num <= 0) return '';
  const lookup: [string, number][] = [
    ['M', 1000], ['CM', 900], ['D', 500], ['CD', 400],
    ['C', 100], ['XC', 90], ['L', 50], ['XL', 40],
    ['X', 10], ['IX', 9], ['V', 5], ['IV', 4], ['I', 1]
  ];
  let roman = '';
  for (const [letter, value] of lookup) {
    while (num >= value) {
      roman += letter;
      num -= value;
    }
  }
  return roman;
}
