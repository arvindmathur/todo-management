import { CompletedTaskList } from "@/components/tasks/CompletedTaskList"

export default function CompletedTasksPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <CompletedTaskList />
    </div>
  )
}

export const metadata = {
  title: "Completed Tasks - Todo Management",
  description: "View and manage your completed tasks",
}