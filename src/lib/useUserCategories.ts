import { useState, useEffect } from 'react';

export function useUserCategories() {
  const [categories, setCategories] = useState<string[]>(['ทั้งหมด', 'อาหาร', 'เดินทาง', 'ช้อปปิ้ง', 'อื่นๆ']);
  const [categoriesWithoutAll, setCategoriesWithoutAll] = useState<string[]>(['อาหาร', 'เดินทาง', 'ช้อปปิ้ง', 'อื่นๆ']);

  useEffect(() => {
    fetch('/api/profile')
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.customCategories) && data.customCategories.length > 0) {
          const rawCats = data.customCategories.filter((c: string) => c && c !== 'ทั้งหมด');
          setCategories(['ทั้งหมด', ...rawCats]);
          setCategoriesWithoutAll(rawCats);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch user categories:', err);
      });
  }, []);

  return { categories, categoriesWithoutAll };
}
