import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { Header } from "@/components/Header";

export default function Pricing() {
  return (
    <>
      <Header />
      <main className="flex flex-col items-center min-h-screen bg-[#0a0a2a] text-white px-4 py-16">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h1 className="text-5xl font-bold mb-2">
            no commitment.
          </h1>
          <h1 className="text-5xl font-bold mb-8">
            cancel anytime.
          </h1>
          <p className="text-xl mb-12">Try ClearRead for one month free</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl mb-12">
          {/* Read Plan */}
          <div className="bg-[#1e1e42] rounded-lg overflow-hidden shadow-lg">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">Read</h2>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <Check className="text-green-400 h-5 w-5 mr-2 mt-1 flex-shrink-0" />
                  <span>Limited learning content</span>
                </li>
                <li className="flex items-start">
                  <X className="text-red-400 h-5 w-5 mr-2 mt-1 flex-shrink-0" />
                  <span>Unlimited content generation</span>
                </li>
                <li className="flex items-start">
                  <X className="text-red-400 h-5 w-5 mr-2 mt-1 flex-shrink-0" />
                  <span>Educator tools</span>
                </li>
                <li className="flex items-start">
                  <X className="text-red-400 h-5 w-5 mr-2 mt-1 flex-shrink-0" />
                  <span>Learning analytics</span>
                </li>
                <li className="flex items-start">
                  <X className="text-red-400 h-5 w-5 mr-2 mt-1 flex-shrink-0" />
                  <span>LMS integration</span>
                </li>
                <li className="flex items-start">
                  <X className="text-red-400 h-5 w-5 mr-2 mt-1 flex-shrink-0" />
                  <span>No ads</span>
                </li>
              </ul>
            </div>
          </div>

          {/* ClearRead Plan */}
          <div className="bg-white rounded-lg overflow-hidden shadow-lg relative">
            <div className="absolute top-4 right-4 bg-white border-2 border-blue-500 rounded-full p-1">
              <Check className="text-blue-500 h-5 w-5" />
            </div>
            <div className="bg-gradient-to-r from-green-400 to-blue-500 p-6">
              <h2 className="text-2xl font-bold text-white mb-6">ClearRead</h2>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <Check className="text-green-100 h-5 w-5 mr-2 mt-1 flex-shrink-0" />
                  <span className="text-white">Expansive learning content</span>
                </li>
                <li className="flex items-start">
                  <Check className="text-green-100 h-5 w-5 mr-2 mt-1 flex-shrink-0" />
                  <span className="text-white">Unlimited content generation</span>
                </li>
                <li className="flex items-start">
                  <Check className="text-green-100 h-5 w-5 mr-2 mt-1 flex-shrink-0" />
                  <span className="text-white">Educator tools</span>
                </li>
                <li className="flex items-start">
                  <Check className="text-green-100 h-5 w-5 mr-2 mt-1 flex-shrink-0" />
                  <span className="text-white">Learning analytics</span>
                </li>
                <li className="flex items-start">
                  <Check className="text-green-100 h-5 w-5 mr-2 mt-1 flex-shrink-0" />
                  <span className="text-white">Personalized</span>
                </li>
                <li className="flex items-start">
                  <Check className="text-green-100 h-5 w-5 mr-2 mt-1 flex-shrink-0" />
                  <span className="text-white">No ads</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Enterprise Plan */}
          <div className="bg-[#1e1e42] rounded-lg overflow-hidden shadow-lg">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">ClearRead Enterprise</h2>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <Check className="text-green-400 h-5 w-5 mr-2 mt-1 flex-shrink-0" />
                  <span>Unlimited content generation</span>
                </li>
                <li className="flex items-start">
                  <Check className="text-green-400 h-5 w-5 mr-2 mt-1 flex-shrink-0" />
                  <span>LMS integration</span>
                </li>
                <li className="flex items-start">
                  <Check className="text-green-400 h-5 w-5 mr-2 mt-1 flex-shrink-0" />
                  <span>Data analytics tools</span>
                </li>
                <li className="flex items-start">
                  <Check className="text-green-400 h-5 w-5 mr-2 mt-1 flex-shrink-0" />
                  <span>Custom implementation options</span>
                </li>
                <li className="flex items-start">
                  <Check className="text-green-400 h-5 w-5 mr-2 mt-1 flex-shrink-0" />
                  <span>Easy scalability</span>
                </li>
                <li className="flex items-start">
                  <Check className="text-green-400 h-5 w-5 mr-2 mt-1 flex-shrink-0" />
                  <span>No ads</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <Button 
          className="bg-white text-blue-500 hover:bg-gray-100 font-bold py-3 px-8 rounded-full text-lg"
        >
          START MY ONE MONTH FREE
        </Button>
      </main>
    </>
  );
}