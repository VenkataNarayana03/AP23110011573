"use strict";

function toPositiveInteger(value, fieldName) {
  const number = Number(value);

  if (!Number.isInteger(number) || number <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }

  return number;
}

function normalizeTask(task, index) {
  if (!task || typeof task !== "object" || Array.isArray(task)) {
    throw new Error(`tasks[${index}] must be an object`);
  }

  const id = task.id || task.taskId || task.vehicleId || task.vehicle || `task-${index + 1}`;
  const duration = toPositiveInteger(
    task.duration ?? task.hours ?? task.serviceDuration ?? task.estimatedHours,
    `tasks[${index}].duration`
  );
  const score = toPositiveInteger(
    task.score ?? task.importance ?? task.impact ?? task.impactScore ?? task.operationalImpact,
    `tasks[${index}].score`
  );

  return {
    id: String(id),
    vehicleId: task.vehicleId ? String(task.vehicleId) : String(id),
    duration,
    score
  };
}

function normalizeTasks(tasks) {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    throw new Error("tasks must be a non-empty array");
  }

  return tasks.map(normalizeTask);
}

function scheduleMaintenance(tasks, budget) {
  const normalizedTasks = normalizeTasks(tasks);
  const availableHours = toPositiveInteger(budget, "budget");
  const dp = Array.from({ length: availableHours + 1 }, () => ({
    score: 0,
    duration: 0,
    tasks: []
  }));

  for (const task of normalizedTasks) {
    for (let hours = availableHours; hours >= task.duration; hours -= 1) {
      const previous = dp[hours - task.duration];
      const candidateScore = previous.score + task.score;
      const candidateDuration = previous.duration + task.duration;

      if (
        candidateScore > dp[hours].score ||
        (candidateScore === dp[hours].score && candidateDuration < dp[hours].duration)
      ) {
        dp[hours] = {
          score: candidateScore,
          duration: candidateDuration,
          tasks: [...previous.tasks, task]
        };
      }
    }
  }

  const best = dp.reduce((currentBest, candidate) => {
    if (candidate.score > currentBest.score) {
      return candidate;
    }

    if (candidate.score === currentBest.score && candidate.duration < currentBest.duration) {
      return candidate;
    }

    return currentBest;
  }, dp[0]);

  return {
    availableHours,
    usedHours: best.duration,
    unusedHours: availableHours - best.duration,
    totalImpactScore: best.score,
    selectedVehicles: best.tasks.map(task => ({
      taskId: task.id,
      vehicleId: task.vehicleId,
      duration: task.duration,
      score: task.score
    }))
  };
}

module.exports = {
  scheduleMaintenance
};
