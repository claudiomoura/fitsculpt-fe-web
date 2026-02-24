import {
  Badge,
  Button,
  Card,
  ExerciseCard,
  MealCard,
  NavItem,
  ProgressBar,
} from '@/design-system/components';

export default function DesignSystemShowcasePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 bg-bg px-4 py-8 text-text">
      <h1 className="text-2xl font-bold">Design System Base Components</h1>

      <Card variant="default" className="space-y-3">
        <h2 className="text-lg font-semibold">Button</h2>
        <div className="flex flex-wrap gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button disabled>Disabled</Button>
          <Button loading>Loading</Button>
        </div>
      </Card>

      <Card variant="elevated" className="space-y-3">
        <h2 className="text-lg font-semibold">Badge / NavItem / ProgressBar</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="pro">Pro</Badge>
          <Badge variant="muscleTag">Muscle</Badge>
          <NavItem href="#">Overview</NavItem>
          <NavItem href="#" variant="active">
            Active
          </NavItem>
        </div>
        <div className="space-y-2">
          <ProgressBar value={48} />
          <ProgressBar value={100} variant="complete" />
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <ExerciseCard title="Bench Press" subtitle="4 sets" detail="Chest + Triceps" progress={60} />
        <ExerciseCard title="Barbell Row" subtitle="3 sets" detail="Back + Biceps" progress={100} variant="completed" />
        <MealCard title="Chicken Bowl" subtitle="Lunch" calories={620} protein="42g" />
        <MealCard title="Greek Yogurt" subtitle="Snack" calories={220} protein="18g" variant="selected" />
      </div>
    </main>
  );
}
