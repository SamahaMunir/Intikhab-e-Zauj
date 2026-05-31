export interface ScoreBreakdown {
  caste: number;
  profession: number;
  ageGap: number;
  city: number;
  height: number;
  houseStatus: number;
  houseArea: number;
  total: number;
}

export function calculateScore(user: any, candidate: any): ScoreBreakdown {
  let breakdown: ScoreBreakdown = {
    caste: 0,
    profession: 0,
    ageGap: 0,
    city: 0,
    height: 0,
    houseStatus: 0,
    houseArea: 0,
    total: 0,
  };

  // 1. CASTE MATCH (25 points max)
  if (user.caste && candidate.caste) {
    if (user.caste.toLowerCase() === candidate.caste.toLowerCase()) {
      breakdown.caste = 25; // Perfect match
    } else {
      breakdown.caste = 5; // Some alignment
    }
  }

  // 2. PROFESSION MATCH (15 points max)
  if (user.profession && candidate.profession) {
    const userProf = user.profession.toLowerCase();
    const candProf = candidate.profession.toLowerCase();
    
    if (userProf === candProf) {
      breakdown.profession = 15;
    } else if (userProf.includes('engineer') && candProf.includes('engineer')) {
      breakdown.profession = 12;
    } else if (userProf.includes('doctor') && candProf.includes('health')) {
      breakdown.profession = 10;
    } else if (userProf.includes('business') || candProf.includes('business')) {
      breakdown.profession = 8;
    } else {
      breakdown.profession = 3;
    }
  }

  // 3. AGE GAP (15 points max)
  if (user.age && candidate.age) {
    const ageDiff = Math.abs(user.age - candidate.age);
    
    if (ageDiff <= 2) {
      breakdown.ageGap = 15; // Ideal
    } else if (ageDiff <= 5) {
      breakdown.ageGap = 12; // Good
    } else if (ageDiff <= 8) {
      breakdown.ageGap = 8; // Acceptable
    } else if (ageDiff <= 12) {
      breakdown.ageGap = 4; // Stretched
    } else {
      breakdown.ageGap = 0; // Too far
    }
  }

  // 4. CITY MATCH (15 points max)
  if (user.city && candidate.city) {
    const userCity = user.city.toLowerCase().trim();
    const candCity = candidate.city.toLowerCase().trim();
    
    if (userCity === candCity) {
      breakdown.city = 15; // Same city
    } else {
      // Check if nearby cities (simplified)
      const lahoreVariants = ['lahore', 'lahore city', 'cantonment lahore'];
      const karachiVariants = ['karachi', 'karachi city'];
      
      if (lahoreVariants.some(v => userCity.includes(v)) && lahoreVariants.some(v => candCity.includes(v))) {
        breakdown.city = 12;
      } else if (karachiVariants.some(v => userCity.includes(v)) && karachiVariants.some(v => candCity.includes(v))) {
        breakdown.city = 12;
      } else {
        breakdown.city = 5; // Different cities
      }
    }
  }

  // 5. HEIGHT PREFERENCE (10 points max)
  // Assume height is stored as "5.9" (feet.inches format)
  if (user.height && candidate.height) {
    const userHeight = parseFloat(user.height);
    const candHeight = parseFloat(candidate.height);
    
    const heightDiff = Math.abs(userHeight - candHeight);
    
    if (heightDiff <= 0.2) {
      breakdown.height = 10;
    } else if (heightDiff <= 0.5) {
      breakdown.height = 8;
    } else if (heightDiff <= 0.8) {
      breakdown.height = 5;
    } else if (heightDiff <= 1.2) {
      breakdown.height = 2;
    } else {
      breakdown.height = 0;
    }
  }

  // 6. HOUSE STATUS (10 points max)
  if (user.houseStatus && candidate.houseStatus) {
    const userStatus = user.houseStatus.toLowerCase();
    const candStatus = candidate.houseStatus.toLowerCase();
    
    if (userStatus === candStatus) {
      breakdown.houseStatus = 10; // Same
    } else if ((userStatus.includes('own') && candStatus.includes('own')) || 
               (userStatus.includes('rent') && candStatus.includes('rent'))) {
      breakdown.houseStatus = 10;
    } else {
      breakdown.houseStatus = 5; // Different status
    }
  }

  // 7. HOUSE AREA (10 points max)
  // Assume area is stored as a number (e.g., 2500 sqft)
  if (user.houseArea && candidate.houseArea) {
    const userArea = parseInt(user.houseArea) || 0;
    const candArea = parseInt(candidate.houseArea) || 0;
    
    if (userArea > 0 && candArea > 0) {
      const areaDiff = Math.abs(userArea - candArea);
      const maxArea = Math.max(userArea, candArea);
      const percentDiff = (areaDiff / maxArea) * 100;
      
      if (percentDiff <= 10) {
        breakdown.houseArea = 10;
      } else if (percentDiff <= 25) {
        breakdown.houseArea = 8;
      } else if (percentDiff <= 50) {
        breakdown.houseArea = 5;
      } else {
        breakdown.houseArea = 2;
      }
    }
  }

  // Calculate total
  breakdown.total = Math.round(
    breakdown.caste +
    breakdown.profession +
    breakdown.ageGap +
    breakdown.city +
    breakdown.height +
    breakdown.houseStatus +
    breakdown.houseArea
  );

  return breakdown;
}