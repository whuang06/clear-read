import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { Header } from "@/components/Header";

export default function Pricing() {
  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl md:text-6xl mb-2">
            <span className="block">No commitment.</span>
            <span className="block text-primary-600">Cancel anytime.</span>
          </h1>
          <p className="mt-4 max-w-3xl mx-auto text-xl text-gray-500">
            Try ClearRead for one month free
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl mx-auto mb-12">
          {/* Read Plan */}
          <div className="bg-white rounded-lg overflow-hidden shadow border">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Read</h2>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <Check className="text-green-500 h-5 w-5 mr-2 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">Limited learning content</span>
                </li>
                <li className="flex items-start">
                  <X className="text-red-500 h-5 w-5 mr-2 mt-1 flex-shrink-0" />
                  <span className="text-gray-500">Unlimited content generation</span>
                </li>
                <li className="flex items-start">
                  <X className="text-red-500 h-5 w-5 mr-2 mt-1 flex-shrink-0" />
                  <span className="text-gray-500">Educator tools</span>
                </li>
                <li className="flex items-start">
                  <X className="text-red-500 h-5 w-5 mr-2 mt-1 flex-shrink-0" />
                  <span className="text-gray-500">Learning analytics</span>
                </li>
                <li className="flex items-start">
                  <X className="text-red-500 h-5 w-5 mr-2 mt-1 flex-shrink-0" />
                  <span className="text-gray-500">LMS integration</span>
                </li>
                <li className="flex items-start">
                  <X className="text-red-500 h-5 w-5 mr-2 mt-1 flex-shrink-0" />
                  <span className="text-gray-500">No ads</span>
                </li>
              </ul>
            </div>
          </div>

          {/* ClearRead Plan */}
          <div className="bg-white rounded-lg overflow-hidden shadow-lg relative border-2 border-primary-500">
            <div className="absolute top-4 right-4 bg-white border-2 border-primary-500 rounded-full p-1">
              <Check className="text-primary-500 h-5 w-5" />
            </div>
            <div className="bg-gradient-to-r from-primary-50 to-primary-100 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">ClearRead</h2>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <Check className="text-green-500 h-5 w-5 mr-2 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">Expansive learning content</span>
                </li>
                <li className="flex items-start">
                  <Check className="text-green-500 h-5 w-5 mr-2 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">Unlimited content generation</span>
                </li>
                <li className="flex items-start">
                  <Check className="text-green-500 h-5 w-5 mr-2 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">Educator tools</span>
                </li>
                <li className="flex items-start">
                  <Check className="text-green-500 h-5 w-5 mr-2 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">Learning analytics</span>
                </li>
                <li className="flex items-start">
                  <Check className="text-green-500 h-5 w-5 mr-2 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">Personalized</span>
                </li>
                <li className="flex items-start">
                  <Check className="text-green-500 h-5 w-5 mr-2 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">No ads</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Enterprise Plan */}
          <div className="bg-white rounded-lg overflow-hidden shadow border">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">ClearRead Enterprise</h2>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <Check className="text-green-500 h-5 w-5 mr-2 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">Unlimited content generation</span>
                </li>
                <li className="flex items-start">
                  <Check className="text-green-500 h-5 w-5 mr-2 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">LMS integration</span>
                </li>
                <li className="flex items-start">
                  <Check className="text-green-500 h-5 w-5 mr-2 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">Data analytics tools</span>
                </li>
                <li className="flex items-start">
                  <Check className="text-green-500 h-5 w-5 mr-2 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">Custom implementation options</span>
                </li>
                <li className="flex items-start">
                  <Check className="text-green-500 h-5 w-5 mr-2 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">Easy scalability</span>
                </li>
                <li className="flex items-start">
                  <Check className="text-green-500 h-5 w-5 mr-2 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">No ads</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="text-center">
          <Button 
            size="lg"
            className="font-bold py-3 px-8 rounded-full text-lg"
          >
            START MY ONE MONTH FREE
          </Button>
        </div>
      </main>
    </>
  );
}