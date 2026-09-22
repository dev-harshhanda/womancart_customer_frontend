/* eslint-disable @next/next/no-img-element */
"use client";

import React from "react";
import {
  CircularProgressbar,
  buildStyles
} from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

interface SemiCircleProps {
  value?: number;
  pointsEarned?: number;
  currentBadge?: string;
  badgeInfo?: Array<{
    badge_name: string;
    min_points: number;
    max_points: number;
  }>;
  size?: number;
}

const SemiCircleProgress: React.FC<SemiCircleProps> = ({ 
  value, 
  pointsEarned = 0,
  currentBadge,
  badgeInfo = []
}) => {
  // Calculate progress percentage based on points earned across all badge tiers
  const calculateProgress = (): number => {
    if (value !== undefined) {
      return value;
    }
    
    if (badgeInfo.length === 0) {
      return 0;
    }

    // Find the maximum points threshold (highest max_points from badgeInfo)
    const maxPoints = Math.max(...badgeInfo.map(badge => badge.max_points));
    
    if (maxPoints === 0) {
      return 0;
    }
    
    // Calculate progress as percentage of points earned relative to max tier
    // Cap at 100% if points exceed max tier
    const progress = Math.min((pointsEarned / maxPoints) * 100, 100);
    
    return Math.round(progress * 100) / 100; // Round to 2 decimal places
  };

  const progressValue = calculateProgress();

  // Determine which steps should be active based on points earned
  const getStepClass = (stepIndex: number): string => {
    if (badgeInfo.length === 0) {
      return "";
    }

    // Sort badges by min_points to ensure correct order
    const sortedBadges = [...badgeInfo].sort((a, b) => a.min_points - b.min_points);
    
    // Ensure we have at least 4 badges (pad with empty if needed)
    // Each step represents a badge tier
    if (stepIndex < sortedBadges.length) {
      const badgeThreshold = sortedBadges[stepIndex].min_points;
      // Badge is active if user has earned enough points to reach this tier
      return pointsEarned >= badgeThreshold ? "active" : "";
    }
    
    return "";
  };

  return (
    <div
      className="earned_points_progress"
      aria-label={`Progress ${progressValue} percent`}
    >
      <figure className={`step step_01 ${getStepClass(0)}`}>
        <img src="/images/loyality_01.svg" alt="Icon" />
      </figure>
      <figure className={`step step_02 ${getStepClass(1)}`}>
        <img src="/images/loyality_02.svg" alt="Icon" />
      </figure>
      <figure className={`step step_03 ${getStepClass(2)}`}>
        <img src="/images/loyality_01.svg" alt="Icon" />
      </figure>
      <figure className={`step step_04 ${getStepClass(3)}`}>
        <img src="/images/loyality_02.svg" alt="Icon" />
      </figure>
      <div className="flip">
        <CircularProgressbar
          value={progressValue}
          maxValue={100}
          circleRatio={0.5}
          strokeWidth={5}
          styles={buildStyles({
            rotation: 0.75,
            strokeLinecap: "round",
            pathTransitionDuration: 0.8,
            pathColor: "var(--commerce-primary)",
            textColor: "#333",
            trailColor: "#E6E6E6",
          })}
        />
      </div>

      <div className="semi_text">
        <h3>{pointsEarned}</h3>
        <p>Points earned</p>
      </div>
    </div>
  );
};

export default SemiCircleProgress;
