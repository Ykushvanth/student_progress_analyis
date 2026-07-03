function classifyP1(ratio) {
  if (ratio >= 0.65) return 'Strong';
  if (ratio >= 0.4) return 'Moderate';
  return 'Weak';
}

function classifyP2(ratio) {
  if (ratio >= 0.5) return 'Strong';
  if (ratio >= 0.3) return 'Moderate';
  return 'Weak';
}

function classifyTEC(score) {
  if (score > 2.75) return 'Highly Challenging';
  if (score >= 1.76) return 'Moderate Challenge';
  return 'Low Challenge';
}

function calculateP1(students) {
  const slowLearners = students.filter(s => s.initial_analysis === 'Slow Learner');
  const mediumLearners = students.filter(s => s.initial_analysis === 'Medium Learner');

  const totalSL = slowLearners.length;
  const totalML = mediumLearners.length;

  if (totalSL === 0 && totalML === 0) {
    return { ratio: 0, classification: 'Weak', details: { totalSL, totalML, passed: 0 } };
  }

  const slPassed = slowLearners.filter(s =>
    s.sessional1_marks !== null && s.sessional1_marks > 40
  ).length;

  const mlPassed = mediumLearners.filter(s =>
    s.sessional1_marks !== null && s.sessional1_marks > 60
  ).length;

  const ratio = (slPassed + mlPassed) / (totalSL + totalML);
  const classification = classifyP1(ratio);

  return {
    ratio: parseFloat(ratio.toFixed(4)),
    classification,
    details: {
      totalSL,
      totalML,
      slPassed,
      mlPassed,
      totalPassed: slPassed + mlPassed
    }
  };
}

function calculateP2(students) {
  const slowLearners = students.filter(s => s.initial_analysis === 'Slow Learner');
  const mediumLearners = students.filter(s => s.initial_analysis === 'Medium Learner');

  const totalSL = slowLearners.length;
  const totalML = mediumLearners.length;

  if (totalSL === 0 && totalML === 0) {
    return { ratio: 0, classification: 'Weak', details: { totalSL, totalML, improved: 0 } };
  }

  const slImproved = slowLearners.filter(s => {
    if (s.sessional1_marks === null || s.sessional2_marks === null) return false;
    const improvement = s.sessional2_marks - s.sessional1_marks;
    return improvement >= 7;
  }).length;

  const mlImproved = mediumLearners.filter(s => {
    if (s.sessional1_marks === null || s.sessional2_marks === null) return false;
    const improvement = s.sessional2_marks - s.sessional1_marks;
    return improvement >= 10;
  }).length;

  const ratio = (slImproved + mlImproved) / (totalSL + totalML);
  const classification = classifyP2(ratio);

  return {
    ratio: parseFloat(ratio.toFixed(4)),
    classification,
    details: {
      totalSL,
      totalML,
      slImproved,
      mlImproved,
      totalImproved: slImproved + mlImproved
    }
  };
}

function calculateStudentQualityScore(avgCGPA) {
  if (avgCGPA >= 6.5) return 1;
  if (avgCGPA >= 5.0) return 2;
  return 3;
}

function getCourseComplexityScore(courseComplexity) {
  return courseComplexity || 2;
}

function calculateFacultyExperienceScore(teachingCount) {
  if (teachingCount >= 3) return 1;
  if (teachingCount === 2) return 2;
  return 3;
}

function calculateClassStrengthScore(classSize) {
  if (classSize <= 35) return 1;
  if (classSize <= 60) return 2;
  return 3;
}

function calculateTEC(avgCGPA, courseComplexity, teachingCount, classSize) {
  const studentQuality = calculateStudentQualityScore(avgCGPA);
  const courseComplexityScore = getCourseComplexityScore(courseComplexity);
  const facultyExperience = calculateFacultyExperienceScore(teachingCount);
  const classStrength = calculateClassStrengthScore(classSize);

  const tecScore = (studentQuality + courseComplexityScore + facultyExperience + classStrength) / 4;
  const classification = classifyTEC(tecScore);

  return {
    score: parseFloat(tecScore.toFixed(2)),
    classification,
    factors: {
      studentQuality: { score: studentQuality, avgCGPA },
      courseComplexity: { score: courseComplexityScore },
      facultyExperience: { score: facultyExperience, teachingCount },
      classStrength: { score: classStrength, classSize }
    }
  };
}

function getEffectivenessMarks(performanceClassification, tecClassification) {
  const matrix = {
    'Strong': {
      'Highly Challenging': 10,
      'Moderate Challenge': 8,
      'Low Challenge': 5
    },
    'Moderate': {
      'Highly Challenging': 8,
      'Moderate Challenge': 5,
      'Low Challenge': 2
    },
    'Weak': {
      'Highly Challenging': 2,
      'Moderate Challenge': 0,
      'Low Challenge': 0
    }
  };

  return matrix[performanceClassification]?.[tecClassification] || 0;
}

function getFinalRating(combinedScore) {
  if (combinedScore > 8.5) return 'Highly Effective';
  if (combinedScore >= 7.0) return 'Effective';
  if (combinedScore >= 5.0) return 'Adequate';
  if (combinedScore >= 3.5) return 'Partially Adequate';
  if (combinedScore >= 2.0) return 'Ineffective';
  return 'Highly Ineffective';
}

function calculateFacultyEffectiveness(students, tecInputs) {
  const p1Result = calculateP1(students);
  const p2Result = calculateP2(students);

  const tecResult = calculateTEC(
    tecInputs.avgCGPA,
    tecInputs.courseComplexity,
    tecInputs.teachingCount,
    tecInputs.classSize
  );

  const p1EffectivenessMarks = getEffectivenessMarks(p1Result.classification, tecResult.classification);
  const p2EffectivenessMarks = getEffectivenessMarks(p2Result.classification, tecResult.classification);

  const combinedScore = (p1EffectivenessMarks + p2EffectivenessMarks) / 2;
  const finalRating = getFinalRating(combinedScore);

  return {
    p1: p1Result,
    p2: p2Result,
    tec: tecResult,
    p1_effectiveness_marks: p1EffectivenessMarks,
    p2_effectiveness_marks: p2EffectivenessMarks,
    effectiveness_score: parseFloat(combinedScore.toFixed(2)),
    rating: finalRating
  };
}

function calculateStudentPerformanceScores(student) {
  if (!student.initial_analysis || !student.sessional1_marks || !student.sessional2_marks) {
    return {
      p1_score: null,
      p2_score: null,
      overall_score: null
    };
  }

  const baseline = {
    'Slow Learner': 40,
    'Medium Learner': 60,
    'Fast Learner': 80
  }[student.initial_analysis] || 60;

  const p1Score = ((student.sessional1_marks - baseline) / baseline) * 100;

  const p2Score = student.sessional1_marks > 0
    ? ((student.sessional2_marks - student.sessional1_marks) / student.sessional1_marks) * 100
    : 0;

  const overallScore = (student.sessional1_marks * 0.4) + (student.sessional2_marks * 0.6);

  return {
    p1_score: parseFloat(p1Score.toFixed(2)),
    p2_score: parseFloat(p2Score.toFixed(2)),
    overall_score: parseFloat(overallScore.toFixed(2))
  };
}

module.exports = {
  calculateP1,
  calculateP2,
  calculateTEC,
  getEffectivenessMarks,
  getFinalRating,
  calculateFacultyEffectiveness,
  calculateStudentPerformanceScores,
  classifyP1,
  classifyP2,
  classifyTEC
};
