export interface StateConfig {
    loop: number;
    iter_init: number;
    iter_num: number;
    select_lamb: number;
    num_train_epochs: number;
    alpha: number;
    limit_new_tokens: number;
    batch_size: number;
    num_var: number;
    name: string;
    description: string;
    budget: number;
    current_loop: number;
    iter: number;
    output_dir: string;
    encoders: string[];
    current_encoder: string;
    models: string[];
    current_models: string;
    select_strategies: string[];
    current_select_strategies: string;
    graph_split: null | string;
    graph_merge: null | string;
    sentence_split: null | string;
    sentence_merge: null | string;
    sentence_vec: null | string;
}