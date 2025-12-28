"use client"

import { useState } from "react"
import { useUserPreferences } from "@/hooks/useUserPreferences"

interface GTDOnboardingProps {
  onComplete?: () => void
  onSkip?: () => void
}

export function GTDOnboarding({ onComplete, onSkip }: GTDOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isCompleting, setIsCompleting] = useState(false)
  const { updatePreferences, preferencesData } = useUserPreferences()

  const steps = [
    {
      title: "Welcome to GTD Mode",
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            Getting Things Done (GTD) is a productivity methodology that helps you organize and manage your tasks more effectively.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h4 className="font-medium text-blue-900 mb-2">What you'll get:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Inbox for capturing all thoughts and ideas</li>
              <li>• Contexts to organize tasks by location or tools needed</li>
              <li>• Areas to manage different aspects of your life</li>
              <li>• Projects to group related tasks</li>
              <li>• Weekly reviews to keep your system up-to-date</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      title: "The GTD Inbox",
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            The inbox is your capture tool - a place to quickly record anything that comes to mind without worrying about organization.
          </p>
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">How it works:</h4>
            <ol className="text-sm text-gray-700 space-y-2">
              <li><strong>1. Capture:</strong> Add thoughts, ideas, tasks, or reminders to your inbox</li>
              <li><strong>2. Process:</strong> Regularly review inbox items and decide what to do with them</li>
              <li><strong>3. Organize:</strong> Convert items into tasks, projects, or reference material</li>
            </ol>
          </div>
          <p className="text-sm text-gray-500">
            The key is to capture everything first, then organize later during processing.
          </p>
        </div>
      )
    },
    {
      title: "Contexts and Areas",
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            Contexts and Areas help you organize tasks based on where you are and what aspect of life they belong to.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <h4 className="font-medium text-green-900 mb-2">Contexts</h4>
              <p className="text-sm text-green-800 mb-2">Where or how you do tasks:</p>
              <ul className="text-sm text-green-700 space-y-1">
                <li>📞 @phone - Calls to make</li>
                <li>💻 @computer - Online tasks</li>
                <li>🏃‍♂️ @errands - Things to do out</li>
                <li>🏠 @home - Tasks at home</li>
                <li>🏢 @office - Work tasks</li>
              </ul>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-md p-4">
              <h4 className="font-medium text-purple-900 mb-2">Areas</h4>
              <p className="text-sm text-purple-800 mb-2">Life domains to maintain:</p>
              <ul className="text-sm text-purple-700 space-y-1">
                <li>💼 Work</li>
                <li>👨‍👩‍👧‍👦 Personal</li>
                <li>💪 Health & Fitness</li>
                <li>💰 Finance</li>
                <li>🎓 Learning</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Projects and Reviews",
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            Projects help you manage multi-step outcomes, while regular reviews keep your system trusted and up-to-date.
          </p>
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-md p-4">
              <h4 className="font-medium text-orange-900 mb-2">Projects</h4>
              <p className="text-sm text-orange-800">
                Any outcome that requires more than one action step. Projects help you track progress toward larger goals and ensure nothing falls through the cracks.
              </p>
            </div>
            <div className="bg-indigo-50 border border-indigo-200 rounded-md p-4">
              <h4 className="font-medium text-indigo-900 mb-2">Weekly Reviews</h4>
              <p className="text-sm text-indigo-800">
                Regular reviews ensure your system stays current and trustworthy. Review all projects, areas, and upcoming commitments to maintain clarity and control.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Ready to Get Started?",
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            You're all set to start using GTD! Your interface will now include all the GTD features, and we'll initialize some default contexts to get you started.
          </p>
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <h4 className="font-medium text-green-900 mb-2">What happens next:</h4>
            <ul className="text-sm text-green-800 space-y-1">
              <li>• GTD features will be enabled in your interface</li>
              <li>• Default contexts (@phone, @computer, etc.) will be created</li>
              <li>• You can start capturing items in your inbox</li>
              <li>• All your existing tasks and projects will remain unchanged</li>
            </ul>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <p className="text-sm text-blue-800">
              <strong>Tip:</strong> You can always toggle GTD mode on or off in your preferences, and all your data will be preserved.
            </p>
          </div>
        </div>
      )
    }
  ]

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = async () => {
    setIsCompleting(true)
    try {
      // Mark onboarding as completed in preferences
      await updatePreferences({
        preferences: {
          ...preferencesData?.preferences,
          completedTaskRetention: preferencesData?.preferences?.completedTaskRetention || 90,
          defaultView: preferencesData?.preferences?.defaultView || "gtd",
          theme: preferencesData?.preferences?.theme || "system",
          notifications: preferencesData?.preferences?.notifications || {
            email: true,
            browser: true,
            weeklyReview: true
          },
          gtdOnboardingCompleted: true
        }
      })
      
      if (onComplete) {
        onComplete()
      }
    } finally {
      setIsCompleting(false)
    }
  }

  const handleSkip = async () => {
    setIsCompleting(true)
    try {
      // Mark onboarding as completed (skipped) in preferences
      await updatePreferences({
        preferences: {
          ...preferencesData?.preferences,
          completedTaskRetention: preferencesData?.preferences?.completedTaskRetention || 90,
          defaultView: preferencesData?.preferences?.defaultView || "simple",
          theme: preferencesData?.preferences?.theme || "system",
          notifications: preferencesData?.preferences?.notifications || {
            email: true,
            browser: true,
            weeklyReview: true
          },
          gtdOnboardingCompleted: true
        }
      })
      
      if (onSkip) {
        onSkip()
      }
    } finally {
      setIsCompleting(false)
    }
  }

  const currentStepData = steps[currentStep]
  const isLastStep = currentStep === steps.length - 1

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {currentStepData.title}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Step {currentStep + 1} of {steps.length}
            </p>
          </div>
          <button
            onClick={handleSkip}
            disabled={isCompleting}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="mb-8">
          {currentStepData.content}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <div>
            {currentStep > 0 && (
              <button
                onClick={handlePrevious}
                disabled={isCompleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Previous
              </button>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleSkip}
              disabled={isCompleting}
              className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
            >
              Skip for now
            </button>
            
            {isLastStep ? (
              <button
                onClick={handleComplete}
                disabled={isCompleting}
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 flex items-center"
              >
                {isCompleting && (
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                Get Started with GTD
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={isCompleting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}