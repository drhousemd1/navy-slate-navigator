
import React from "react";
import { Card } from "@/components/ui/card";
import PriorityBadge from "@/components/task/PriorityBadge";
import FrequencyTracker from "@/components/task/FrequencyTracker";
import CardBackground from "./CardBackground";
import { useImageCarousel } from "./useImageCarousel";
import { Rule } from "./RuleEditor";

interface RuleCardProps {
  rule: Rule;
  globalCarouselIndex: number;
}

const RuleCard: React.FC<RuleCardProps> = ({ rule, globalCarouselIndex }) => {
  const {
    visibleImage,
    transitionImage,
    isTransitioning,
    currentIndex,
    setCurrentIndex,
    nextImage,
    prevImage
  } = useImageCarousel({
    images: rule.background_images || [],
    globalCarouselIndex
  });

  return (
    <Card className="relative overflow-hidden">
      <CardBackground
        visibleImage={visibleImage}
        transitionImage={transitionImage}
        isTransitioning={isTransitioning}
        focalPointX={rule.focal_point_x ?? 0.5}
        focalPointY={rule.focal_point_y ?? 0.5}
        backgroundOpacity={rule.background_opacity ?? 100}
      />
      <div className="relative z-10 p-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-xl font-semibold">{rule.title}</h3>
          <PriorityBadge priority={rule.priority} />
        </div>
        <p className="text-sm">{rule.description}</p>
        <div className="mt-4 flex justify-between items-center">
          <FrequencyTracker
            frequency="weekly"
            frequency_count={2}
            calendar_color="#888888"
            usage_data={[1, 0, 2, 1, 0, 0, 1]}
          />
        </div>
      </div>
    </Card>
  );
};

export default RuleCard;
