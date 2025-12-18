import { AppSidebar } from "@/components/app-sidebar"

export default function Home() {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <main className="flex-1 p-8">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-3xl font-bold text-foreground mb-2">Welcome back, John</h1>
          <p className="text-muted-foreground mb-8">Here's what's happening with your projects today.</p>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Total Projects", value: "12", change: "+2 this week" },
              { title: "Active Tasks", value: "48", change: "8 due today" },
              { title: "Team Members", value: "24", change: "+3 this month" },
            ].map((stat) => (
              <div key={stat.title} className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className="mt-2 text-3xl font-bold text-card-foreground">{stat.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{stat.change}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
