import { useCallback } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { ADD_CAR, GET_CARS } from "@/graphql/queries";
import type { Car } from "@/types";

interface GetCarsData {
  cars: Car[];
}

interface AddCarData {
  addCar: Car;
}

interface AddCarVars {
  make: string;
  model: string;
  year: number;
  color: string;
}

export function useCars() {
  const { data, loading, error } = useQuery<GetCarsData>(GET_CARS);

  const [addCarMutation] = useMutation<AddCarData, AddCarVars>(ADD_CAR, {
    update(cache, { data: mutationData }) {
      if (!mutationData) return;
      const existing = cache.readQuery<GetCarsData>({ query: GET_CARS });
      const newCar = mutationData.addCar;
      cache.writeQuery<GetCarsData>({
        query: GET_CARS,
        data: {
          cars: existing ? [...existing.cars, newCar] : [newCar],
        },
      });
    },
  });

  const addCar = useCallback(
    async (make: string, model: string, year: number, color: string) => {
      await addCarMutation({ variables: { make, model, year, color } });
    },
    [addCarMutation],
  );

  return {
    cars: data?.cars ?? [],
    loading,
    error,
    addCar,
  };
}
