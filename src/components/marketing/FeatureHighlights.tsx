"use client"

interface FeatureHighlightsProps {
  showTitle?: boolean
  className?: string
}

export function FeatureHighlights({ showTitle = true, className = "" }: FeatureHighlightsProps) {
  return (
    <div className={className}>
      {showTitle && (
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Why Choose Our Todo Management?
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Built for productivity, designed for simplicity. Experience task management that actually works.
          </p>
        </div>
      )}
      
      <div className="grid md:grid-cols-3 gap-8">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="text-blue-600 mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Simple & Fast</h3>
          <p className="text-gray-600">
            Create and edit tasks effortlessly with our streamlined interface. No complex menus or confusing workflows - just quick, intuitive task management that gets out of your way.
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="text-green-600 mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Works Everywhere</h3>
          <p className="text-gray-600">
            Optimized for both desktop and mobile devices. Our screen-efficient design ensures you can manage tasks smoothly whether you're at your computer or on the go.
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="text-purple-600 mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Focus & Filter</h3>
          <p className="text-gray-600">
            Smart filtering helps you focus on what matters most. View today's priorities, overdue items, or upcoming tasks with intelligent sorting and organization.
          </p>
        </div>
      </div>

      <div className="mt-12 bg-blue-50 p-8 rounded-lg">
        <h3 className="text-xl font-semibold text-gray-900 mb-4 text-center">
          Built Different
        </h3>
        <div className="grid md:grid-cols-2 gap-6 text-sm">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">✨ What makes us different:</h4>
            <ul className="space-y-1 text-gray-600">
              <li>• Inline task creation - no popup forms</li>
              <li>• One-click editing and completion</li>
              <li>• Intelligent Focus view for daily priorities</li>
              <li>• Responsive design that works on any screen</li>
              <li>• Fast, reliable performance</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">🚀 Coming soon:</h4>
            <ul className="space-y-1 text-gray-600">
              <li>• Getting Things Done (GTD) methodology</li>
              <li>• Advanced project management</li>
              <li>• Context-based task organization</li>
              <li>• Weekly review workflows</li>
              <li>• Team collaboration features</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}