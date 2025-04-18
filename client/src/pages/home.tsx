import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { TextInput } from "@/components/TextInput";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { BookOpen, BookText, Lightbulb, Brain } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WaterRippleEffect } from "@/components/WaterRippleEffect";

export default function Home() {
  const [textInputOpen, setTextInputOpen] = useState(false);
  const [_, setLocation] = useLocation();
  const [isLoaded, setIsLoaded] = useState(false);

  // Add a slight delay to ensure animation runs smoothly after component mounts
  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <Header />
      <WaterRippleEffect>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Hero section with shimmer gradient text */}
          <div className="text-center mb-16">
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl md:text-6xl relative">
              <span className="block relative">
                <span className="inline-block bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-primary-600 to-cyan-500 animate-gradient-x">
                  Clear
                </span>
              </span>
              <span className="block relative">
                <span className="inline-block bg-clip-text text-transparent bg-gradient-to-r from-cyan-500 via-primary-500 to-blue-600 animate-gradient-x">
                  Read
                </span>
              </span>
            </h1>
            <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              Transform any text into bite-sized chunks with personalized comprehension exercises 
              that adapt to your performance.
            </p>
            <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
              <div className="rounded-md shadow">
                <Button 
                  size="lg"
                  onClick={() => setTextInputOpen(true)}
                  className="w-full flex items-center justify-center bg-gradient-to-r from-primary-600 to-blue-600 hover:from-primary-700 hover:to-blue-700 transition-all duration-300"
                >
                  <BookText className="mr-2 h-5 w-5" />
                  Start Reading Now
                </Button>
              </div>
            </div>
          </div>

          {/* Feature section with animated entrance */}
          <div className="py-12 bg-white bg-opacity-90 backdrop-blur-sm rounded-xl shadow-lg">
            <div className="max-w-xl mx-auto px-4 sm:px-6 lg:max-w-7xl lg:px-8">
              <h2 className="sr-only">Adaptive Reading Features</h2>
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                <Card className={`transition-all duration-700 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'} border border-primary-100 hover:border-primary-200 hover:shadow-lg hover:shadow-primary-50 transition-all duration-300`}>
                  <CardHeader>
                    <div className="p-3 rounded-full bg-primary-50 inline-block mb-2">
                      <BookOpen className="h-6 w-6 text-primary-500" />
                    </div>
                    <CardTitle>Semantic Chunking</CardTitle>
                    <CardDescription>
                      Intelligently breaks text into meaningful segments that preserve context and flow.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500">
                      Our advanced algorithm analyzes text structure to create natural 
                      reading units that are easier to process and understand.
                    </p>
                  </CardContent>
                </Card>

                <Card className={`transition-all duration-700 delay-100 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'} border border-primary-100 hover:border-primary-200 hover:shadow-lg hover:shadow-primary-50 transition-all duration-300`}>
                  <CardHeader>
                    <div className="p-3 rounded-full bg-primary-50 inline-block mb-2">
                      <Brain className="h-6 w-6 text-primary-500" />
                    </div>
                    <CardTitle>Adaptive Difficulty</CardTitle>
                    <CardDescription>
                      Adjusts content complexity based on your comprehension level.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500">
                      When you struggle with difficult passages, our AI simplifies upcoming 
                      content while preserving key information and context.
                    </p>
                  </CardContent>
                </Card>

                <Card className={`transition-all duration-700 delay-200 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'} border border-primary-100 hover:border-primary-200 hover:shadow-lg hover:shadow-primary-50 transition-all duration-300`}>
                  <CardHeader>
                    <div className="p-3 rounded-full bg-primary-50 inline-block mb-2">
                      <Lightbulb className="h-6 w-6 text-primary-500" />
                    </div>
                    <CardTitle>Smart Assessment</CardTitle>
                    <CardDescription>
                      Generates relevant questions and provides insightful feedback.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500">
                      Each chunk includes custom questions that test comprehension,
                      with detailed feedback to help you improve your understanding.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </WaterRippleEffect>

      <TextInput 
        open={textInputOpen} 
        onOpenChange={setTextInputOpen} 
      />
    </>
  );
}
