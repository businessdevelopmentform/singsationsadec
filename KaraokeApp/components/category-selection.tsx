"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { User } from "lucide-react"
import CategoryRegistration from "@/components/category-registration"

interface CategorySelectionProps {
  onNext: (category: string) => void
  onProfile?: () => void
}

export default function CategorySelection({ onNext, onProfile }: CategorySelectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const categories = [
    {
      id: "adults",
      title: "Adults Competition",
      description: "Ages 18 and up - Show your vocal prowess",
      icon: "🎤",
    },
    {
      id: "kids",
      title: "Kids Competition",
      description: "Ages 6-17 - Young talent showcase",
      icon: "🌟",
    },
    {
      id: "celebrities",
      title: "Celebrity Competition",
      description: "Special celebrity showcase category",
      icon: "⭐",
    },
  ]

  if (selectedCategory) {
    return (
      <CategoryRegistration
        category={selectedCategory}
        onBack={() => setSelectedCategory(null)}
        onNext={() => onNext(selectedCategory)}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-600 p-4">
      <div className="max-w-sm mx-auto pt-4">
        {onProfile && (
          <div className="flex justify-end mb-4">
            <Button
              variant="ghost"
              onClick={onProfile}
              className="text-white hover:bg-white/20 flex items-center gap-2"
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Profile</span>
            </Button>
          </div>
        )}

        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Choose Your Category</h1>
          <p className="text-white/90 text-sm">Select the competition category that suits you best</p>
        </div>

        <div className="space-y-4">
          {categories.map((category) => (
            <Card
              key={category.id}
              className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
              onClick={() => setSelectedCategory(category.id)}
            >
              <CardHeader className="text-center pb-2">
                <div className="text-4xl mb-2">{category.icon}</div>
                <CardTitle className="text-lg text-gray-800">{category.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription className="text-gray-600 mb-4">{category.description}</CardDescription>
                <Button
                  className="w-full h-12 text-base bg-amber-600 hover:bg-amber-700"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedCategory(category.id)
                  }}
                >
                  Register for {category.title.split(" ")[0]}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
