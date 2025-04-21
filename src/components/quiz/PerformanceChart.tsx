import { useEffect, useRef } from 'react';
import { StoredEvaluation } from '../../services/evaluation/storage';

interface PerformanceChartProps {
  evaluations: StoredEvaluation[];
}

const PerformanceChart = ({ evaluations }: PerformanceChartProps) => {
  const chartRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!chartRef.current || evaluations.length === 0) return;
    
    // Get all score categories from the first evaluation to set up chart
    const firstEval = evaluations[0];
    const allScoreCategories = Object.keys(firstEval.evaluation.scores)
      .filter(key => key !== 'overall');
    
    // Check if we have the same categories across all evaluations
    const hasConsistentCategories = evaluations.every(evaluationItem => {
      return allScoreCategories.every(category => 
        typeof evaluationItem.evaluation.scores[category] === 'number'
      );
    });
    
    if (!hasConsistentCategories) {
      // If inconsistent categories, just show a message
      const el = chartRef.current;
      el.innerHTML = '<div class="text-gray-500 text-sm italic text-center p-4">Performance metrics chart not available</div>';
      return;
    }
    
    // Calculate average scores per category
    const categoryScores = allScoreCategories.map(category => {
      const scores = evaluations.map(evalItem => evalItem.evaluation.scores[category] || 0);
      const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      return {
        category: formatCategoryName(category),
        average: Math.round(average * 10) / 10
      };
    });
    
    // Sort by average score (descending)
    categoryScores.sort((a, b) => b.average - a.average);
    
    // Create simple horizontal bar chart
    const el = chartRef.current;
    el.innerHTML = '';
    el.classList.add('space-y-3', 'py-2');
    
    categoryScores.forEach(item => {
      const barContainer = document.createElement('div');
      barContainer.className = 'flex items-center';
      
      const label = document.createElement('div');
      label.className = 'w-1/3 text-sm text-gray-600 pr-2';
      label.textContent = item.category;
      
      const barWrapper = document.createElement('div');
      barWrapper.className = 'w-2/3 flex items-center';
      
      const barBackground = document.createElement('div');
      barBackground.className = 'w-full h-5 bg-gray-200 rounded-full overflow-hidden flex-1';
      
      const bar = document.createElement('div');
      bar.className = `h-full rounded-full ${getColorClass(item.average)}`;
      bar.style.width = `${item.average * 10}%`;
      
      const scoreText = document.createElement('div');
      scoreText.className = 'text-sm font-medium ml-2 w-8';
      scoreText.textContent = `${item.average}`;
      
      barBackground.appendChild(bar);
      barWrapper.appendChild(barBackground);
      barWrapper.appendChild(scoreText);
      
      barContainer.appendChild(label);
      barContainer.appendChild(barWrapper);
      
      el.appendChild(barContainer);
    });
    
  }, [evaluations]);
  
  // Helper function to format category names
  const formatCategoryName = (category: string): string => {
    return category
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  // Get color class based on score
  const getColorClass = (score: number): string => {
    if (score >= 8) return 'bg-green-500';
    if (score >= 6) return 'bg-yellow-500';
    return 'bg-red-500';
  };
  
  return (
    <div className="performance-chart bg-white rounded-lg border shadow-sm p-4 mb-4">
      <h3 className="font-medium mb-4">Performance By Category</h3>
      <div ref={chartRef} className="min-h-[100px]">
        {evaluations.length === 0 && (
          <div className="text-gray-500 text-sm italic text-center p-4">
            No evaluation data available
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceChart; 