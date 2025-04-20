import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Reading from "@/pages/reading";
import Progress from "@/pages/progress";
import { ReadingProvider } from "./context/ReadingContext";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/reading" component={Reading} />
      <Route path="/progress" component={Progress} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ReadingProvider>
          <Toaster />
          <Router />
        </ReadingProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
