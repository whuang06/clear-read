import { Link } from "wouter";
import { BookOpen, Library, DollarSign } from "lucide-react";
import { useLocation } from "wouter";

export function Header() {
  const [location] = useLocation();

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-3">
            <BookOpen className="h-8 w-8 text-primary-500" />
            <h1 className="text-xl font-semibold text-gray-900">
              ClearRead
            </h1>
          </div>
          <nav className="flex space-x-4">
            <Link 
              href="/" 
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                location === "/" 
                  ? "bg-primary-50 text-primary-700" 
                  : "text-gray-500 hover:text-primary-500"
              }`}
            >
              Dashboard
            </Link>
            <Link 
              href="/reading" 
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                location === "/reading" 
                  ? "bg-primary-50 text-primary-700" 
                  : "text-gray-500 hover:text-primary-500"
              }`}
            >
              New Reading
            </Link>
            <Link 
              href="/library" 
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                location === "/library" 
                  ? "bg-primary-50 text-primary-700" 
                  : "text-gray-500 hover:text-primary-500"
              }`}
            >
              <Library className="h-4 w-4 inline mr-1" />
              Library
            </Link>
            <Link 
              href="/progress" 
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                location === "/progress" 
                  ? "bg-primary-50 text-primary-700" 
                  : "text-gray-500 hover:text-primary-500"
              }`}
            >
              My Progress
            </Link>
            <Link 
              href="/pricing" 
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                location === "/pricing" 
                  ? "bg-primary-50 text-primary-700" 
                  : "text-gray-500 hover:text-primary-500"
              }`}
            >
              <DollarSign className="h-4 w-4 inline mr-1" />
              Pricing
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
