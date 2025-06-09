import React, { useState } from 'react';
import { AnalysisResult, EdgeCase, UserJourney } from '../types';
import { 
  AlertTriangle, 
  CheckCircle, 
  AlertCircle, 
  Info, 
  User, 
  ArrowRight,
  Filter,
  Eye,
  EyeOff,
  GitBranch,
  Play,
  Square,
  Clock,
  Database,
  TrendingUp,
  HelpCircle,
  Zap,
  RefreshCw,
  AlertOctagon,
  Activity,
  BarChart3,
  Network,
  Timer,
  Users,
  ExternalLink
} from 'lucide-react';

interface ResultsViewerProps {
  result: AnalysisResult;
}

export const ResultsViewer: React.FC<ResultsViewerProps> = ({ result }) => {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'journeys' | 'issues'>('overview');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedJourneys, setExpandedJourneys] = useState<Set<string>>(new Set());

  const toggleJourneyExpansion = (journeyId: string) => {
    const newExpanded = new Set(expandedJourneys);
    if (newExpanded.has(journeyId)) {
      newExpanded.delete(journeyId);
    } else {
      newExpanded.add(journeyId);
    }
    setExpandedJourneys(newExpanded);
  };

  const scrollToJourney = (journeyId: string) => {
    // Switch to journeys tab
    setSelectedTab('journeys');
    
    // Expand the journey
    const newExpanded = new Set(expandedJourneys);
    newExpanded.add(journeyId);
    setExpandedJourneys(newExpanded);
    
    // Scroll to the journey after a brief delay to allow tab switch
    setTimeout(() => {
      const element = document.getElementById(`journey-${journeyId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Add a highlight effect
        element.classList.add('ring-2', 'ring-blue-500', 'ring-opacity-50');
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-blue-500', 'ring-opacity-50');
        }, 2000);
      }
    }, 100);
  };

  const getSeverityIcon = (severity: EdgeCase['severity']) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'moderate':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'minor':
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: EdgeCase['severity']) => {
    switch (severity) {
      case 'critical':
        return 'border-red-200 bg-red-50';
      case 'moderate':
        return 'border-yellow-200 bg-yellow-50';
      case 'minor':
        return 'border-blue-200 bg-blue-50';
    }
  };

  const getCategoryIcon = (category: EdgeCase['category']) => {
    switch (category) {
      case 'business_logic_gap':
        return '🧠';
      case 'flow_inconsistency':
        return '🔄';
      case 'operational_gap':
        return '⚙️';
    }
  };

  const getCategoryLabel = (category: EdgeCase['category']) => {
    switch (category) {
      case 'business_logic_gap':
        return 'Business Logic Gap';
      case 'flow_inconsistency':
        return 'Flow Inconsistency';
      case 'operational_gap':
        return 'Operational Gap';
    }
  };

  const getPriorityColor = (priority: UserJourney['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const filteredEdgeCases = result.edgeCases.filter(edgeCase => {
    const severityMatch = selectedSeverity === 'all' || edgeCase.severity === selectedSeverity;
    const categoryMatch = selectedCategory === 'all' || edgeCase.category === selectedCategory;
    return severityMatch && categoryMatch;
  });

  const renderJourneyFlow = (journey: UserJourney) => {
    return (
      <div className="bg-gray-50 rounded-lg p-4 sm:p-6 mt-4">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h4 className="font-medium text-gray-900 flex items-center text-sm sm:text-base">
            <Network className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-blue-600" />
            User Journey Flow
          </h4>
        </div>

        {/* Flow Steps */}
        <div className="space-y-3 sm:space-y-4">
          {journey.steps.map((step, index) => (
            <div key={step.id} className="flex items-start">
              <div className="flex flex-col items-center mr-3 sm:mr-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full flex items-center justify-center text-xs sm:text-sm font-medium shadow-lg">
                  {index + 1}
                </div>
                {index < journey.steps.length - 1 && (
                  <div className="w-0.5 h-8 sm:h-12 bg-gradient-to-b from-blue-300 to-purple-300 mt-2"></div>
                )}
              </div>
              
              <div className="flex-1 bg-white rounded-lg p-3 sm:p-5 border border-gray-200 shadow-sm">
                <div className="flex items-center mb-2 sm:mb-3">
                  <Play className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 mr-2" />
                  <h5 className="font-semibold text-gray-900 text-sm sm:text-base">{step.action}</h5>
                </div>
                
                <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3">{step.description}</p>
                
                <div className="flex items-center text-xs sm:text-sm text-green-600 mb-2 sm:mb-3">
                  <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  <span className="font-medium">Expected: </span>
                  <span className="ml-1">{step.expectedOutcome}</span>
                </div>
                
                {step.dependencies.length > 0 && (
                  <div className="mt-2 sm:mt-3 text-xs text-gray-500">
                    <span className="font-medium">Dependencies:</span> {step.dependencies.join(', ')}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderOverview = () => (
    <div className="space-y-4 sm:space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
          <div className="flex items-center">
            <Users className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 mr-2 sm:mr-3" />
            <div>
              <p className="text-xs sm:text-sm text-blue-600 font-medium">User Journeys</p>
              <p className="text-xl sm:text-2xl font-bold text-blue-900">{result.summary.totalJourneys}</p>
              <p className="text-xs text-blue-600">Core flows identified</p>
            </div>
          </div>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-red-600 mr-2 sm:mr-3" />
            <div>
              <p className="text-xs sm:text-sm text-red-600 font-medium">Critical Issues</p>
              <p className="text-xl sm:text-2xl font-bold text-red-900">{result.summary.criticalIssues}</p>
              <p className="text-xs text-red-600">Require immediate attention</p>
            </div>
          </div>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4">
          <div className="flex items-center">
            <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-600 mr-2 sm:mr-3" />
            <div>
              <p className="text-xs sm:text-sm text-yellow-600 font-medium">Total Issues</p>
              <p className="text-xl sm:text-2xl font-bold text-yellow-900">{result.summary.totalEdgeCases}</p>
              <p className="text-xs text-yellow-600">Implementation gaps</p>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
          <div className="flex items-center">
            <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 mr-2 sm:mr-3" />
            <div>
              <p className="text-xs sm:text-sm text-green-600 font-medium">Readiness Score</p>
              <p className="text-xl sm:text-2xl font-bold text-green-900">{result.summary.coverageScore}%</p>
              <p className="text-xs text-green-600">
                {result.summary.coverageScore >= 80 ? 'Ready for development' : 'Needs improvement'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Business Context */}
      {(result.context.company || result.context.problemStatement) && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Business Context</h3>
          {result.context.company && (
            <p className="text-gray-700 mb-2 text-sm sm:text-base">
              <span className="font-medium">Company:</span> {result.context.company}
            </p>
          )}
          {result.context.problemStatement && (
            <p className="text-gray-700 text-sm sm:text-base">
              <span className="font-medium">Problem Statement:</span> {result.context.problemStatement}
            </p>
          )}
        </div>
      )}

      {/* Critical Issues Preview */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Critical Issues Requiring Attention</h3>
        <div className="space-y-3">
          {result.edgeCases
            .filter(e => e.severity === 'critical')
            .slice(0, 3)
            .map(edgeCase => (
              <div key={edgeCase.id} className="flex items-start p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
                {getSeverityIcon(edgeCase.severity)}
                <div className="ml-3 flex-1">
                  <div className="flex items-center mb-2">
                    <span className="text-base sm:text-lg mr-2">{getCategoryIcon(edgeCase.category)}</span>
                    <p className="font-medium text-red-900 text-sm sm:text-base">{edgeCase.title}</p>
                  </div>
                  <p className="text-xs sm:text-sm text-red-700 mb-2">{edgeCase.description}</p>
                  {edgeCase.businessImpact && (
                    <div className="flex items-center text-xs text-red-600">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      <span>Impact: {edgeCase.businessImpact}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          {result.edgeCases.filter(e => e.severity === 'critical').length === 0 && (
            <div className="text-center py-4 text-gray-500">
              <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm sm:text-base">No critical issues identified - great job!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderJourneys = () => (
    <div className="space-y-4">
      {result.journeys.map(journey => (
        <div key={journey.id} id={`journey-${journey.id}`} className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center flex-1 min-w-0">
              <User className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 mr-2 sm:mr-3 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{journey.name}</h3>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1">
                  <span className="text-xs sm:text-sm text-gray-500">{journey.userType}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(journey.priority)}`}>
                    {journey.priority} priority
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => toggleJourneyExpansion(journey.id)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 ml-2"
            >
              {expandedJourneys.has(journey.id) ? (
                <EyeOff className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
              ) : (
                <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
              )}
            </button>
          </div>
          
          <p className="text-gray-700 mb-4 text-sm sm:text-base">{journey.description}</p>
          
          {journey.businessImpact && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <div className="flex items-center text-blue-700">
                <TrendingUp className="h-4 w-4 mr-2" />
                <span className="font-medium text-sm sm:text-base">Business Impact:</span>
              </div>
              <p className="text-xs sm:text-sm text-blue-600 mt-1">{journey.businessImpact}</p>
            </div>
          )}
          
          {expandedJourneys.has(journey.id) && renderJourneyFlow(journey)}
        </div>
      ))}
    </div>
  );

  const renderIssues = () => (
    <div className="space-y-4 sm:space-y-6">
      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
          <Filter className="h-5 w-5 text-gray-500" />
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="moderate">Moderate</option>
            <option value="minor">Minor</option>
          </select>
          
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="all">All Categories</option>
            <option value="business_logic_gap">Business Logic Gaps</option>
            <option value="flow_inconsistency">Flow Inconsistencies</option>
            <option value="operational_gap">Operational Gaps</option>
          </select>
        </div>
      </div>

      {/* Issues List */}
      <div className="space-y-4">
        {filteredEdgeCases.map(edgeCase => (
          <div key={edgeCase.id} className={`border rounded-lg p-4 sm:p-6 ${getSeverityColor(edgeCase.severity)}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start flex-1 min-w-0">
                {getSeverityIcon(edgeCase.severity)}
                <div className="ml-3 flex-1 min-w-0">
                  <div className="flex items-center mb-2">
                    <span className="text-lg sm:text-2xl mr-2">{getCategoryIcon(edgeCase.category)}</span>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 break-words">{edgeCase.title}</h3>
                  </div>
                  <span className="inline-block px-3 py-1 bg-white bg-opacity-70 rounded-full text-xs sm:text-sm font-medium text-gray-700 mb-3">
                    {getCategoryLabel(edgeCase.category)}
                  </span>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 ml-2 ${
                edgeCase.severity === 'critical' ? 'bg-red-100 text-red-800' :
                edgeCase.severity === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {edgeCase.severity.toUpperCase()}
              </span>
            </div>
            
            <p className="text-gray-700 mb-4 text-sm sm:text-base">{edgeCase.description}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2 flex items-center text-sm sm:text-base">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Recommendation
                </h4>
                <p className="text-xs sm:text-sm text-gray-600">{edgeCase.recommendation}</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2 flex items-center text-sm sm:text-base">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  Business Impact
                </h4>
                <p className="text-xs sm:text-sm text-gray-600">
                  {edgeCase.businessImpact || edgeCase.impact || 'Impact assessment needed'}
                </p>
              </div>
            </div>
            
            {edgeCase.exampleScenario && (
              <div className="mb-4">
                <h4 className="font-medium text-gray-900 mb-2 flex items-center text-sm sm:text-base">
                  <Info className="h-4 w-4 mr-1" />
                  Example Scenario
                </h4>
                <p className="text-xs sm:text-sm text-gray-600 bg-white bg-opacity-50 p-3 rounded-lg">
                  {edgeCase.exampleScenario}
                </p>
              </div>
            )}
            
            {edgeCase.questionsToResolve && edgeCase.questionsToResolve.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium text-gray-900 mb-2 flex items-center text-sm sm:text-base">
                  <HelpCircle className="h-4 w-4 mr-1" />
                  Questions to Resolve
                </h4>
                <ul className="text-xs sm:text-sm text-gray-600 space-y-1">
                  {edgeCase.questionsToResolve.map((question, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-gray-400 mr-2">•</span>
                      <span>{question}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {edgeCase.affectedJourneys.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2 flex items-center text-sm sm:text-base">
                  <GitBranch className="h-4 w-4 mr-1" />
                  Affected User Journeys
                </h4>
                <div className="flex flex-wrap gap-2">
                  {edgeCase.affectedJourneys.map(journeyId => {
                    const journey = result.journeys.find(j => j.id === journeyId);
                    return journey ? (
                      <button
                        key={journeyId}
                        onClick={() => scrollToJourney(journeyId)}
                        className="inline-flex items-center px-3 py-1 bg-white bg-opacity-70 rounded-full text-xs sm:text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer border border-gray-200 hover:border-blue-300"
                      >
                        <span className="truncate max-w-32">{journey.name}</span>
                        <ExternalLink className="h-3 w-3 ml-1 flex-shrink-0" />
                      </button>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-bold mb-2">PRD Analysis Results</h2>
        <p className="text-blue-100 text-sm sm:text-base">
          Document: {result.documentName} • Analyzed: {result.analyzedAt.toLocaleDateString()}
        </p>
        <div className="mt-2 text-xs sm:text-sm text-blue-100">
          {result.summary.totalJourneys} journeys identified • {result.summary.totalEdgeCases} issues found
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-4 sm:space-x-8 px-4 sm:px-6 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: CheckCircle },
            { id: 'journeys', label: 'User Journeys', icon: User },
            { id: 'issues', label: 'Issues & Gaps', icon: AlertTriangle }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSelectedTab(id as any)}
              className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                selectedTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="h-4 w-4 mr-2" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6">
        {selectedTab === 'overview' && renderOverview()}
        {selectedTab === 'journeys' && renderJourneys()}
        {selectedTab === 'issues' && renderIssues()}
      </div>
    </div>
  );
};