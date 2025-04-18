import { useState } from "react";
import { Header } from "@/components/Header";
import { TextInput } from "@/components/TextInput";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { BookOpen, BookText, Lightbulb, Brain } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  const [textInputOpen, setTextInputOpen] = useState(false);
  const [_, setLocation] = useLocation();

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
            <span className="block">Clear</span>
            <span className="block text-primary-600">Read</span>
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
                className="w-full flex items-center justify-center"
              >
                <BookText className="mr-2 h-5 w-5" />
                Start Reading Now
              </Button>
            </div>
          </div>
        </div>

        {/* Feature section */}
        <div className="py-12 bg-white">
          <div className="max-w-xl mx-auto px-4 sm:px-6 lg:max-w-7xl lg:px-8">
            <h2 className="sr-only">Adaptive Reading Features</h2>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <BookOpen className="h-8 w-8 text-primary-500 mb-2" />
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

              <Card>
                <CardHeader>
                  <Brain className="h-8 w-8 text-primary-500 mb-2" />
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

              <Card>
                <CardHeader>
                  <Lightbulb className="h-8 w-8 text-primary-500 mb-2" />
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

      <TextInput 
        open={textInputOpen} 
        onOpenChange={setTextInputOpen} 
      />
    </>
  );
}
