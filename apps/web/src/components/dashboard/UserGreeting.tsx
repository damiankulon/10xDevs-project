interface UserGreetingProps {
  userName: string;
}

export function UserGreeting({ userName }: UserGreetingProps) {
  const getGreeting = () => {
    const hour = new Date().getHours();

    if (hour < 12) {
      return 'Dzień dobry';
    } else if (hour < 18) {
      return 'Dobry wieczór';
    } else {
      return 'Dobry wieczór';
    }
  };

  const formatDate = () => {
    return new Date().toLocaleDateString('pl-PL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="user-greeting">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        {getGreeting()}, {userName}!
      </h1>
      <p className="text-sm text-muted-foreground mt-1">{formatDate()}</p>
    </div>
  );
}
