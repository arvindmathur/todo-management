import { PreferencesForm } from "@/components/preferences"

export default function PreferencesPage() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Preferences</h1>
        <p className="mt-2 text-gray-600">
          Customize your productivity workflow and application settings.
        </p>
      </div>
      
      <PreferencesForm />
    </div>
  )
}