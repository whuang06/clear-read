import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, ReferenceLine 
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Header } from '@/components/Header';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { apiRequest, getQueryFn } from '@/lib/queryClient';

interface ProgressPoint {
  date: string;
  elo_rating: number;
  chunks_completed: number;
  difficulty_level: number;
}

interface User {
  id: number;
  username: string;
  elo_rating: number;
  reading_level: string;
  created_at: string;
}

interface UserProgress {
  user: User;
  progress_history: ProgressPoint[];
}

export default function ProgressPage() {
  const isMobile = useIsMobile();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState<string>("30");
  
  // For demo purposes, use a fixed user ID
  // In a real app, this would come from the authentication context
  const userId = 2;

  // Query to fetch user progress data
  const { data, isLoading, error, refetch } = useQuery<UserProgress>({
    queryKey: [`/api/user-progress/${userId}?days=${timeRange}`]
  });

  // Show toast if there's an error
  useEffect(() => {
    if (error) {
      toast({
        title: "Error Loading Progress",
        description: "Failed to load your reading progress. Please try again later.",
        variant: "destructive"
      });
    }
  }, [error, toast]);

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  // Prepare data for the chart
  const chartData = data?.progress_history.map((point: ProgressPoint) => ({
    ...point,
    date: formatDate(point.date),
    // Create a formatted tooltip value
    tooltipValue: `ELO: ${point.elo_rating} | Chunks: ${point.chunks_completed}`
  })) || [];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto py-6 px-4 md:px-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reading Progress</h1>
            <p className="text-muted-foreground">
              Track your reading progress and skill improvement over time
            </p>
          </div>
          
          <div className="mt-4 md:mt-0 flex items-center gap-4">
            <Select
              value={timeRange}
              onValueChange={setTimeRange}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline" 
              onClick={() => refetch()}
            >
              Refresh
            </Button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : data ? (
          <div className="grid gap-6 md:grid-cols-2">
            {/* User Stats Card */}
            <Card>
              <CardHeader>
                <CardTitle>Reader Profile</CardTitle>
                <CardDescription>
                  Your current reading stats and achievements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Username</span>
                    <span className="font-medium">{data.user.username}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Current ELO Rating</span>
                    <span className="font-bold text-lg">{data.user.elo_rating}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Reading Level</span>
                    <Badge variant="outline" className="font-medium">
                      {data.user.reading_level}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Member Since</span>
                    <span className="font-medium">{formatDate(data.user.created_at)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Readings</span>
                    <span className="font-medium">
                      {data.progress_history.reduce((sum: number, point: ProgressPoint) => sum + point.chunks_completed, 0)} chunks
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* ELO Progress Chart Card */}
            <Card>
              <CardHeader>
                <CardTitle>ELO Rating Progress</CardTitle>
                <CardDescription>
                  Your reading skill development over time
                </CardDescription>
              </CardHeader>
              <CardContent className="h-64">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        tickCount={isMobile ? 4 : 7}
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        domain={['dataMin - 50', 'dataMax + 50']}
                        padding={{ top: 10, bottom: 10 }}
                      />
                      <Tooltip 
                        formatter={(value, name) => {
                          if (name === 'elo_rating') return [value, 'ELO Rating'];
                          return [value, name];
                        }} 
                      />
                      <Line
                        type="monotone"
                        dataKey="elo_rating"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ strokeWidth: 2 }}
                        activeDot={{ r: 6 }}
                        name="ELO"
                      />
                      <ReferenceLine 
                        y={1000} 
                        label="Average" 
                        stroke="hsl(var(--muted-foreground))" 
                        opacity={0.6}
                        strokeDasharray="3 3"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground text-center">
                      No progress data available yet.<br />
                      Complete some readings to see your progress!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Reading Activity Card */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Recent Reading Activity</CardTitle>
                <CardDescription>
                  Your reading sessions and difficulty levels
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        yAxisId="left"
                        tick={{ fontSize: 12 }}
                        domain={[0, 'dataMax + 10']}
                        orientation="left"
                      />
                      <YAxis 
                        yAxisId="right"
                        tick={{ fontSize: 12 }}
                        domain={[0, 2000]}
                        orientation="right"
                      />
                      <Tooltip />
                      <Legend />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="chunks_completed"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        name="Chunks Read"
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="difficulty_level"
                        stroke="hsl(var(--destructive))"
                        strokeWidth={2}
                        name="Avg. Difficulty"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground text-center">
                      No activity data available yet.<br />
                      Complete some readings to see your activity!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-muted-foreground mb-4">
              Unable to load progress data at this time.
            </p>
            <Button onClick={() => refetch()}>
              Try Again
            </Button>
          </div>
        )}
        
        <div className="mt-8 text-center">
          <Button 
            variant="outline" 
            onClick={() => setLocation('/')}
          >
            Return to Home
          </Button>
        </div>
      </main>
    </div>
  );
}