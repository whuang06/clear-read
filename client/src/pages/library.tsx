import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Search, BookMarked, Filter } from "lucide-react";

// Book data structure
interface Book {
  id: number;
  title: string;
  author: string;
  lexileScore: number;
  year: number;
  genre: string[];
  coverUrl: string;
  description: string;
}

// A collection of real books with their Lexile scores and other metadata
const books: Book[] = [
  {
    id: 1,
    title: "To Kill a Mockingbird",
    author: "Harper Lee",
    lexileScore: 870,
    year: 1960,
    genre: ["Fiction", "Classic", "Coming-of-Age"],
    coverUrl: "https://upload.wikimedia.org/wikipedia/commons/4/4f/To_Kill_a_Mockingbird_%28first_edition_cover%29.jpg",
    description: "Set in the American South during the 1930s, this classic tells the story of a lawyer who defends a Black man wrongly accused of a crime, as seen through the eyes of his daughter Scout."
  },
  {
    id: 2,
    title: "1984",
    author: "George Orwell",
    lexileScore: 1090,
    year: 1949,
    genre: ["Fiction", "Dystopian", "Political"],
    coverUrl: "https://upload.wikimedia.org/wikipedia/commons/c/c3/1984first.jpg",
    description: "A dystopian social science fiction novel that examines the consequences of totalitarianism, mass surveillance, and repressive regimentation of people and behaviors."
  },
  {
    id: 3,
    title: "The Hobbit",
    author: "J.R.R. Tolkien",
    lexileScore: 1000,
    year: 1937,
    genre: ["Fiction", "Fantasy", "Adventure"],
    coverUrl: "https://upload.wikimedia.org/wikipedia/en/4/4a/TheHobbit_FirstEdition.jpg",
    description: "The adventure of Bilbo Baggins, a hobbit who embarks on an unexpected journey with a wizard and dwarves to reclaim a treasure guarded by a dragon."
  },
  {
    id: 4,
    title: "The Very Hungry Caterpillar",
    author: "Eric Carle",
    lexileScore: 460,
    year: 1969,
    genre: ["Children", "Picture Book"],
    coverUrl: "https://upload.wikimedia.org/wikipedia/en/b/b5/HungryCaterpillar.JPG",
    description: "This beloved children's book follows the journey of a caterpillar as it eats its way through various foods before transforming into a butterfly."
  },
  {
    id: 5,
    title: "Pride and Prejudice",
    author: "Jane Austen",
    lexileScore: 1100,
    year: 1813,
    genre: ["Fiction", "Classic", "Romance"],
    coverUrl: "https://upload.wikimedia.org/wikipedia/commons/1/17/PrideAndPrejudiceTitlePage.jpg",
    description: "A romantic novel that follows the emotional development of Elizabeth Bennet as she navigates issues of manners, upbringing, morality, and marriage in British society."
  },
  {
    id: 6,
    title: "The Catcher in the Rye",
    author: "J.D. Salinger",
    lexileScore: 790,
    year: 1951,
    genre: ["Fiction", "Coming-of-Age"],
    coverUrl: "https://upload.wikimedia.org/wikipedia/commons/8/89/The_Catcher_in_the_Rye_%281951%2C_first_edition_cover%29.jpg",
    description: "Holden Caulfield narrates his experiences in New York City after being expelled from prep school, exploring themes of adolescent angst and alienation."
  },
  {
    id: 7,
    title: "Sapiens: A Brief History of Humankind",
    author: "Yuval Noah Harari",
    lexileScore: 1180,
    year: 2011,
    genre: ["Non-fiction", "History", "Science"],
    coverUrl: "https://upload.wikimedia.org/wikipedia/en/0/06/SapiensHarari.jpg",
    description: "A comprehensive exploration of human history from the emergence of Homo sapiens to the present day, examining the impact of cognitive, agricultural, and scientific revolutions."
  },
  {
    id: 8,
    title: "Harry Potter and the Sorcerer's Stone",
    author: "J.K. Rowling",
    lexileScore: 880,
    year: 1997,
    genre: ["Fiction", "Fantasy", "Young Adult"],
    coverUrl: "https://upload.wikimedia.org/wikipedia/en/6/6b/Harry_Potter_and_the_Philosopher%27s_Stone_Book_Cover.jpg",
    description: "An orphaned boy discovers he's a wizard and begins attending a magical boarding school, where he makes friends and enemies while uncovering the truth about his parents' deaths."
  },
  {
    id: 9,
    title: "The Great Gatsby",
    author: "F. Scott Fitzgerald",
    lexileScore: 1070,
    year: 1925,
    genre: ["Fiction", "Classic"],
    coverUrl: "https://upload.wikimedia.org/wikipedia/commons/7/7a/The_Great_Gatsby_Cover_1925_Retouched.jpg",
    description: "Set in the Jazz Age, this novel follows mysterious millionaire Jay Gatsby and his obsession with beautiful socialite Daisy Buchanan, critiquing the American Dream."
  },
  {
    id: 10,
    title: "Educated",
    author: "Tara Westover",
    lexileScore: 1160,
    year: 2018,
    genre: ["Non-fiction", "Memoir", "Biography"],
    coverUrl: "https://upload.wikimedia.org/wikipedia/en/1/1c/Educated_-_Tara_Westover.jpg",
    description: "A memoir about growing up in a survivalist family in Idaho and the author's journey to education at BYU, Cambridge, and Harvard despite never attending school."
  },
  {
    id: 11,
    title: "Charlotte's Web",
    author: "E.B. White",
    lexileScore: 680,
    year: 1952,
    genre: ["Fiction", "Children", "Fantasy"],
    coverUrl: "https://upload.wikimedia.org/wikipedia/en/f/fe/CharlotteWeb.png",
    description: "A children's novel about the friendship between a pig named Wilbur and a barn spider named Charlotte who writes messages in her web to save Wilbur from slaughter."
  },
  {
    id: 12,
    title: "A Brief History of Time",
    author: "Stephen Hawking",
    lexileScore: 1290,
    year: 1988,
    genre: ["Non-fiction", "Science", "Physics"],
    coverUrl: "https://upload.wikimedia.org/wikipedia/en/8/87/Brief_History_of_Time.jpg",
    description: "Renowned physicist Stephen Hawking explains complex concepts like black holes, the Big Bang, and the nature of time and space to non-specialist readers."
  },
  {
    id: 13,
    title: "The Hunger Games",
    author: "Suzanne Collins",
    lexileScore: 810,
    year: 2008,
    genre: ["Fiction", "Dystopian", "Young Adult"],
    coverUrl: "https://upload.wikimedia.org/wikipedia/en/3/39/The_Hunger_Games_cover.jpg",
    description: "In a dystopian future, a young girl volunteers to participate in a televised competition where 24 teenagers fight to the death, replacing her younger sister."
  },
  {
    id: 14,
    title: "The Little Prince",
    author: "Antoine de Saint-Exupéry",
    lexileScore: 710,
    year: 1943,
    genre: ["Fiction", "Fantasy", "Philosophy"],
    coverUrl: "https://upload.wikimedia.org/wikipedia/en/0/05/Littleprince.JPG",
    description: "A poetic tale about a young prince who visits various planets in space, addressing themes of loneliness, friendship, love, and loss."
  },
  {
    id: 15,
    title: "The Road",
    author: "Cormac McCarthy",
    lexileScore: 670,
    year: 2006,
    genre: ["Fiction", "Post-Apocalyptic"],
    coverUrl: "https://upload.wikimedia.org/wikipedia/commons/2/29/The_Road_%282006%29.jpg",
    description: "A father and his young son journey across post-apocalyptic America toward the sea, facing starvation, extreme weather, and dangerous groups of survivors."
  },
  {
    id: 16,
    title: "Romeo and Juliet",
    author: "William Shakespeare",
    lexileScore: 940,
    year: 1597,
    genre: ["Fiction", "Classic", "Tragedy", "Drama"],
    coverUrl: "https://upload.wikimedia.org/wikipedia/commons/5/55/Romeo_and_Juliet_Q2_Title_Page.jpg",
    description: "A tragedy about two young star-crossed lovers whose deaths ultimately reconcile their feuding families in Verona, Italy."
  },
  {
    id: 17,
    title: "Where the Wild Things Are",
    author: "Maurice Sendak",
    lexileScore: 740,
    year: 1963,
    genre: ["Children", "Picture Book", "Fantasy"],
    coverUrl: "https://upload.wikimedia.org/wikipedia/en/8/85/WhereTWThingsAre.jpg",
    description: "After being sent to bed without supper for misbehaving, Max's room transforms into a jungle and he sails to an island inhabited by Wild Things who make him their king."
  },
  {
    id: 18,
    title: "The Da Vinci Code",
    author: "Dan Brown",
    lexileScore: 850,
    year: 2003,
    genre: ["Fiction", "Mystery", "Thriller"],
    coverUrl: "https://upload.wikimedia.org/wikipedia/en/6/6b/DaVinciCode.jpg",
    description: "Harvard symbologist Robert Langdon and cryptologist Sophie Neveu investigate a murder in the Louvre and discover a trail of clues hidden in Leonardo da Vinci's works."
  },
  {
    id: 19,
    title: "Thinking, Fast and Slow",
    author: "Daniel Kahneman",
    lexileScore: 1180,
    year: 2011,
    genre: ["Non-fiction", "Psychology"],
    coverUrl: "https://upload.wikimedia.org/wikipedia/en/c/c1/Thinking%2C_Fast_and_Slow.jpg",
    description: "Nobel Prize-winning psychologist Daniel Kahneman explains the two systems that drive the way we think: fast, intuitive thinking and slow, rational thinking."
  },
  {
    id: 20,
    title: "Brave New World",
    author: "Aldous Huxley",
    lexileScore: 870,
    year: 1932,
    genre: ["Fiction", "Dystopian", "Science Fiction"],
    coverUrl: "https://upload.wikimedia.org/wikipedia/en/6/62/BraveNewWorld_FirstEdition.jpg",
    description: "Set in a futuristic World State, this dystopian novel explores how technology, conditioning, and entertainment control society through artificial pleasure."
  }
];

// Available genre filters
const allGenres = Array.from(new Set(books.flatMap(book => book.genre)));

// Lexile score difficulty ranges
const difficultyRanges = [
  { name: "Early Reader", min: 0, max: 600 },
  { name: "Intermediate", min: 601, max: 800 },
  { name: "Middle Grade", min: 801, max: 1000 },
  { name: "Young Adult", min: 1001, max: 1200 },
  { name: "Advanced", min: 1201, max: 2000 }
];

export default function Library() {
  // Filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [difficultyRange, setDifficultyRange] = useState<[number, number]>([0, 2000]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all_levels");
  const [filteredBooks, setFilteredBooks] = useState<Book[]>(books);
  const [activeTab, setActiveTab] = useState("all");

  // Filter books based on search, genres, and lexile score
  useEffect(() => {
    const filtered = books.filter(book => {
      // Filter by search term
      const matchesSearch = 
        book.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        book.author.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filter by selected genres
      const matchesGenre = 
        selectedGenres.length === 0 || 
        book.genre.some(g => selectedGenres.includes(g));
      
      // Filter by lexile score range
      const matchesLexile = 
        book.lexileScore >= difficultyRange[0] && 
        book.lexileScore <= difficultyRange[1];
      
      return matchesSearch && matchesGenre && matchesLexile;
    });
    
    setFilteredBooks(filtered);
  }, [searchTerm, selectedGenres, difficultyRange]);

  // Handle difficulty selection
  const handleDifficultyChange = (difficulty: string) => {
    setSelectedDifficulty(difficulty);
    
    if (difficulty === "all_levels" || difficulty === "") {
      setDifficultyRange([0, 2000]);
      return;
    }
    
    const range = difficultyRanges.find(r => r.name === difficulty);
    if (range) {
      setDifficultyRange([range.min, range.max]);
    }
  };

  // Handle genre selection
  const toggleGenre = (genre: string) => {
    if (selectedGenres.includes(genre)) {
      setSelectedGenres(selectedGenres.filter(g => g !== genre));
    } else {
      setSelectedGenres([...selectedGenres, genre]);
    }
  };

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    if (value === "all") {
      setSelectedGenres([]);
    } else {
      setSelectedGenres([value]);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col space-y-2 mb-8">
        <h1 className="text-3xl font-bold">Reading Library</h1>
        <p className="text-muted-foreground">
          Browse books by difficulty level, genre, and more. Find your next reading adventure!
        </p>
      </div>
      
      {/* Search and filters */}
      <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title or author..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex space-x-2">
          <Select value={selectedDifficulty} onValueChange={handleDifficultyChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Lexile Difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all_levels">All Levels</SelectItem>
              {difficultyRanges.map((range) => (
                <SelectItem key={range.name} value={range.name}>
                  {range.name} ({range.min}-{range.max}L)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="icon" className="flex-shrink-0">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Display filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        {difficultyRange[0] > 0 || difficultyRange[1] < 2000 ? (
          <Badge variant="secondary" className="flex items-center gap-1">
            Lexile: {difficultyRange[0]}-{difficultyRange[1]}L
          </Badge>
        ) : null}
        
        {selectedGenres.map(genre => (
          <Badge 
            key={genre} 
            variant="outline" 
            className="flex items-center gap-1 cursor-pointer"
            onClick={() => toggleGenre(genre)}
          >
            {genre} ×
          </Badge>
        ))}
        
        {(difficultyRange[0] > 0 || difficultyRange[1] < 2000 || selectedGenres.length > 0) && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => {
              setSelectedGenres([]);
              setDifficultyRange([0, 2000]);
              setSelectedDifficulty("all_levels");
            }}
          >
            Clear All
          </Button>
        )}
      </div>
      
      {/* Genre tabs */}
      <Tabs defaultValue="all" value={activeTab} onValueChange={handleTabChange} className="mb-6">
        <TabsList className="mb-4 overflow-x-auto flex flex-nowrap space-x-2">
          <TabsTrigger value="all">All Books</TabsTrigger>
          <TabsTrigger value="Fiction">Fiction</TabsTrigger>
          <TabsTrigger value="Non-fiction">Non-fiction</TabsTrigger>
          <TabsTrigger value="Children">Children's</TabsTrigger>
          <TabsTrigger value="Classic">Classics</TabsTrigger>
          <TabsTrigger value="Fantasy">Fantasy</TabsTrigger>
          <TabsTrigger value="Science Fiction">Sci-Fi</TabsTrigger>
        </TabsList>
      </Tabs>
      
      {/* Books grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredBooks.length > 0 ? (
          filteredBooks.map((book) => (
            <Card key={book.id} className="overflow-hidden flex flex-col h-full">
              <div className="relative pb-[60%] bg-muted">
                <img 
                  src={book.coverUrl} 
                  alt={`Cover of ${book.title}`} 
                  className="absolute inset-0 h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://placehold.co/400x600?text=No+Cover';
                  }}
                />
              </div>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg line-clamp-2">{book.title}</CardTitle>
                    <CardDescription className="line-clamp-1">{book.author} ({book.year})</CardDescription>
                  </div>
                  <Badge variant="outline" className="whitespace-nowrap">
                    {book.lexileScore}L
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pb-2 flex-grow">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {book.description}
                </p>
              </CardContent>
              <CardFooter className="pt-0 flex flex-wrap gap-2">
                {book.genre.slice(0, 3).map((g) => (
                  <Badge 
                    key={g} 
                    variant="secondary" 
                    className="text-xs cursor-pointer"
                    onClick={() => toggleGenre(g)}
                  >
                    {g}
                  </Badge>
                ))}
                {book.genre.length > 3 && (
                  <Badge variant="outline" className="text-xs">+{book.genre.length - 3}</Badge>
                )}
              </CardFooter>
              <div className="p-4 pt-0 mt-auto">
                <Button variant="default" className="w-full flex items-center">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Read Now
                </Button>
              </div>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center p-12">
            <BookMarked className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No books found</h3>
            <p className="text-muted-foreground">Try adjusting your filters or search terms</p>
          </div>
        )}
      </div>
    </div>
  );
}