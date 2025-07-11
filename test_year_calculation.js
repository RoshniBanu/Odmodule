// Test the year calculation logic
const testYearCalculation = () => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // January is 0
  
  console.log(`Current Date: ${currentDate.toDateString()}`);
  console.log(`Current Year: ${currentYear}`);
  console.log(`Current Month: ${currentMonth}`);
  
  // Test different year of joining scenarios
  const testCases = [
    { yearOfJoin: 2023, expected: currentMonth >= 7 ? "3rd" : "2nd" },
    { yearOfJoin: 2022, expected: currentMonth >= 7 ? "4th" : "3rd" },
    { yearOfJoin: 2024, expected: currentMonth >= 7 ? "2nd" : "1st" },
    { yearOfJoin: 2021, expected: "4th" }, // Should always be 4th year
  ];
  
  console.log('\nYear Calculation Test Results:');
  console.log('================================');
  
  testCases.forEach(testCase => {
    let yearsSinceJoining = currentYear - testCase.yearOfJoin;
    
    // If current month is before July (month 7), reduce by 1 year
    if (currentMonth < 7) {
      yearsSinceJoining -= 1;
    }
    
    // Ensure minimum of 1st year and maximum of 4th year
    const currentYearOfStudy = Math.max(1, Math.min(4, yearsSinceJoining + 1));
    
    // Convert to ordinal format (1st, 2nd, 3rd, 4th)
    const ordinalSuffixes = ['', 'st', 'nd', 'rd', 'th'];
    const calculatedYear = `${currentYearOfStudy}${ordinalSuffixes[currentYearOfStudy]}`;
    
    const status = calculatedYear === testCase.expected ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - Year of Join: ${testCase.yearOfJoin} -> Current Year: ${calculatedYear} (Expected: ${testCase.expected})`);
  });
};

testYearCalculation();
